import json
import uuid
from pathlib import Path
from typing import Any

import pytest
from sqlmodel import Session, delete, select

from app import crud
from app.api.routes.behavior_reports import report_values
from app.core.config import settings
from app.models import (
    AnalysisResult,
    AnalysisTask,
    BehaviorReport,
    BehaviorReportImport,
    Video,
)
from app.services import analysis_pipeline
from app.services.analysis_pipeline import _analysis_metrics


def sample_report() -> dict:
    return {
        "schema_version": "1.0",
        "sequence_id": "A-5-test",
        "sequence": {
            "duration_seconds": 10.0,
            "detection_count": 12,
            "track_count": 3,
        },
        "individuals": [
            {"mean_speed_body_lengths_s": 0.5},
            {"mean_speed_body_lengths_s": 1.5},
        ],
        "group": {
            "flux": {"entry_count": None, "exit_count": None},
            "temporal_summary": [
                {
                    "warmup": False,
                    "mean_active_tracks_per_frame": 2.0,
                    "activity_robust_z": 4.0,
                },
                {
                    "warmup": True,
                    "mean_active_tracks_per_frame": 1.0,
                    "activity_robust_z": 99.0,
                },
            ],
        },
    }


def test_report_values_preserve_unknown_flux_and_count_non_warmup_anomaly() -> None:
    values = report_values(
        BehaviorReportImport(
            report=sample_report(),
            source_sha256="a" * 64,
            modality="RGB",
        )
    )

    assert values["entry_count"] is None
    assert values["exit_count"] is None
    assert values["anomaly_window_count"] == 1
    assert values["source_sha256"] == "a" * 64


def test_analysis_metrics_are_derived_from_report() -> None:
    metrics = _analysis_metrics(sample_report())

    assert metrics == {
        "detection_count": 12,
        "track_count": 3,
        "entry_count": None,
        "exit_count": None,
        "average_speed": 1.0,
        "activity_index": None,
        "mean_active_tracks_per_frame": 1.5,
    }


def test_report_helpers_reject_invalid_artifacts(tmp_path: Path) -> None:
    missing = tmp_path / "missing.json"
    with pytest.raises(RuntimeError, match="behavior_summary"):
        analysis_pipeline._load_report(missing)

    invalid = tmp_path / "invalid.json"
    invalid.write_text("[]", encoding="utf-8")
    with pytest.raises(RuntimeError, match="JSON"):
        analysis_pipeline._load_report(invalid)

    payload = tmp_path / "payload.json"
    payload.write_text('{"ok":true}', encoding="utf-8")
    assert analysis_pipeline._load_report(payload) == {"ok": True}
    assert analysis_pipeline._sha256(payload) == (
        "4062edaf750fb8074e7e83e0c9028c94e32468a8b6f1614774328ef045150f93"
    )
    assert analysis_pipeline._rows({"rows": [{"x": 1}, "bad"]}, "rows") == [{"x": 1}]
    assert analysis_pipeline._rows({"rows": {}}, "rows") == []
    assert analysis_pipeline._mean([]) is None

    with pytest.raises(RuntimeError, match="sequence"):
        _analysis_metrics({})


class _WorkerResponse:
    def __init__(self, value: dict[str, Any]) -> None:
        self.value = value

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, Any]:
        return self.value


class _WorkerClient:
    def __init__(self, value: dict[str, Any]) -> None:
        self.value = value

    def __enter__(self) -> _WorkerClient:
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def post(self, *_args: object, **_kwargs: object) -> _WorkerResponse:
        return _WorkerResponse(self.value)


def test_real_pipeline_success_and_failure(
    db: Session, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    owner = crud.get_user_by_email(session=db, email=settings.FIRST_SUPERUSER)
    assert owner is not None
    for model in (AnalysisResult, AnalysisTask, Video, BehaviorReport):
        db.exec(delete(model))
    db.commit()

    input_video = tmp_path / "sample.mp4"
    input_video.write_bytes(b"video")
    failed_video = Video(
        original_filename="failed.mp4",
        stored_filename=f"{uuid.uuid4()}.mp4",
        file_path=str(input_video),
        scene_type="OUTDOOR",
        file_size=input_video.stat().st_size,
        content_type="video/mp4",
        owner_id=owner.id,
    )
    db.add(failed_video)
    db.commit()
    db.refresh(failed_video)
    failed_task = AnalysisTask(video_id=failed_video.id, owner_id=owner.id)
    db.add(failed_task)
    db.commit()
    db.refresh(failed_task)

    monkeypatch.setattr(settings, "ANALYSIS_WORKER_URL", None)
    monkeypatch.setattr(settings, "ANALYSIS_WORKER_TOKEN", None)
    analysis_pipeline.run_analysis_pipeline(failed_task.id)
    db.expire_all()
    failed_task = db.get(AnalysisTask, failed_task.id)
    assert failed_task is not None
    assert failed_task.status == "FAILED"
    assert "尚未配置" in (failed_task.error_message or "")

    output_root = tmp_path / "results"
    video = Video(
        original_filename="success.mp4",
        stored_filename=f"{uuid.uuid4()}.mp4",
        file_path=str(input_video),
        scene_type="OUTDOOR",
        file_size=input_video.stat().st_size,
        content_type="video/mp4",
        owner_id=owner.id,
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    task = AnalysisTask(
        video_id=video.id,
        owner_id=owner.id,
        model_name="test-model",
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    report_path = output_root / str(task.id) / "behavior" / "behavior_summary.json"
    report_path.parent.mkdir(parents=True)
    report = sample_report()
    report["provenance"] = {"executor": "test"}
    report_path.write_text(json.dumps(report), encoding="utf-8")
    worker_result = {
        "report_path": str(report_path),
        "result_video_path": None,
        "anomaly_window_count": 1,
    }

    monkeypatch.setattr(settings, "ANALYSIS_WORKER_URL", "http://worker")
    monkeypatch.setattr(settings, "ANALYSIS_WORKER_TOKEN", "token")
    monkeypatch.setattr(settings, "ANALYSIS_OUTPUT_DIR", str(output_root))
    monkeypatch.setattr(
        analysis_pipeline.httpx,
        "Client",
        lambda **_kwargs: _WorkerClient(worker_result),
    )
    analysis_pipeline.run_analysis_pipeline(task.id)

    db.expire_all()
    completed = db.get(AnalysisTask, task.id)
    assert completed is not None
    assert completed.status == "COMPLETED"
    assert completed.progress == 100
    result = db.exec(
        select(AnalysisResult).where(AnalysisResult.task_id == task.id)
    ).one()
    assert result.detected_individuals == 12
    assert result.valid_tracks == 3
    assert result.activity_index is None
    assert json.loads(result.metrics_json or "{}")["source"] == "real_analysis_worker"
    behavior = db.exec(
        select(BehaviorReport).where(BehaviorReport.sequence_id == "A-5-test")
    ).one()
    assert behavior.track_count == 3

    for model in (AnalysisResult, AnalysisTask, Video, BehaviorReport):
        db.exec(delete(model))
    db.commit()
