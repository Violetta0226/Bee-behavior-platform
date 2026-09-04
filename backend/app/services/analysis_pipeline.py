import hashlib
import json
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
from sqlmodel import Session, select

from app.api.routes.behavior_reports import report_values
from app.core.config import settings
from app.core.db import engine
from app.models import (
    AnalysisResult,
    AnalysisTask,
    BehaviorReport,
    BehaviorReportImport,
    Video,
)

_MAX_REPORT_BYTES = 32 * 1024 * 1024


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _load_report(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise RuntimeError("分析执行器未生成 behavior_summary.json")
    if path.stat().st_size > _MAX_REPORT_BYTES:
        raise RuntimeError("行为报告超过 32 MiB 安全上限")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError("行为报告根节点必须为 JSON 对象")
    return value


def _rows(container: dict[str, Any], key: str) -> list[dict[str, Any]]:
    value = container.get(key, [])
    if not isinstance(value, list):
        return []
    return [row for row in value if isinstance(row, dict)]


def _mean(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


def _analysis_metrics(report: dict[str, Any]) -> dict[str, Any]:
    sequence = report.get("sequence")
    group = report.get("group")
    if not isinstance(sequence, dict) or not isinstance(group, dict):
        raise RuntimeError("行为报告缺少 sequence 或 group")
    individuals = _rows(report, "individuals")
    temporal = _rows(group, "temporal_summary")
    speeds = [
        float(row["mean_speed_body_lengths_s"])
        for row in individuals
        if isinstance(row.get("mean_speed_body_lengths_s"), int | float)
    ]
    activity = [
        float(row["mean_active_tracks_per_frame"])
        for row in temporal
        if isinstance(row.get("mean_active_tracks_per_frame"), int | float)
    ]
    flux = group.get("flux")
    if not isinstance(flux, dict):
        flux = {}
    return {
        "detection_count": int(sequence.get("detection_count", 0)),
        "track_count": int(sequence.get("track_count", 0)),
        "entry_count": flux.get("entry_count"),
        "exit_count": flux.get("exit_count"),
        "average_speed": _mean(speeds),
        "activity_index": None,
        "mean_active_tracks_per_frame": _mean(activity),
    }


def _mark_failed(task_id: uuid.UUID, message: str) -> None:
    with Session(engine) as session:
        task = session.get(AnalysisTask, task_id)
        if not task:
            return
        task.status = "FAILED"
        task.error_message = message[:1000]
        task.completed_at = datetime.now(UTC)
        session.add(task)
        video = session.get(Video, task.video_id)
        if video:
            video.status = "FAILED"
            session.add(video)
        session.commit()


def run_analysis_pipeline(task_id: uuid.UUID) -> None:
    """Run the configured real detector/tracker/behavior worker.

    A missing worker is a hard failure. The production path never manufactures
    placeholder metrics or marks a task complete without an artifact.
    """

    if not settings.ANALYSIS_WORKER_URL or not settings.ANALYSIS_WORKER_TOKEN:
        _mark_failed(task_id, "真实分析执行器尚未配置")
        return

    try:
        with Session(engine) as session:
            task = session.get(AnalysisTask, task_id)
            if not task:
                return
            video = session.get(Video, task.video_id)
            if not video:
                raise RuntimeError("分析任务关联的视频不存在")
            task.status = "PROCESSING"
            task.progress = 10
            task.started_at = datetime.now(UTC)
            task.error_message = None
            video.status = "PROCESSING"
            session.add(task)
            session.add(video)
            session.commit()

            output_dir = Path(settings.ANALYSIS_OUTPUT_DIR) / str(task.id)
            payload = {
                "input_video": video.file_path,
                "output_dir": str(output_dir),
                "sequence_id": Path(video.original_filename).stem[:255],
                "modality": "rgb" if video.scene_type == "OUTDOOR" else "infrared",
            }

        with httpx.Client(timeout=settings.ANALYSIS_TIMEOUT_SECONDS) as client:
            response = client.post(
                f"{settings.ANALYSIS_WORKER_URL.rstrip('/')}/analyze",
                json=payload,
                headers={"X-Worker-Token": settings.ANALYSIS_WORKER_TOKEN},
            )
            response.raise_for_status()
            worker_result = response.json()
        if not isinstance(worker_result, dict):
            raise RuntimeError("分析执行器返回格式无效")

        report_path = Path(str(worker_result.get("report_path", "")))
        expected_dir = (Path(settings.ANALYSIS_OUTPUT_DIR) / str(task_id)).resolve()
        resolved_report_path = report_path.resolve()
        if expected_dir not in resolved_report_path.parents:
            raise RuntimeError("分析执行器返回了越界的报告路径")
        report = _load_report(resolved_report_path)
        source_sha256 = _sha256(resolved_report_path)
        metrics = _analysis_metrics(report)

        with Session(engine) as session:
            task = session.get(AnalysisTask, task_id)
            if not task:
                return
            video = session.get(Video, task.video_id)
            if not video:
                raise RuntimeError("分析任务关联的视频不存在")
            existing_result = session.exec(
                select(AnalysisResult).where(AnalysisResult.task_id == task.id)
            ).first()
            if existing_result:
                raise RuntimeError("该任务已经存在分析结果")

            modality = "RGB" if video.scene_type == "OUTDOOR" else "IR"
            report_in = BehaviorReportImport(
                report=report,
                source_sha256=source_sha256,
                source_path=str(resolved_report_path),
                modality=modality,
                model_version=task.model_name,
                metric_status="descriptive_only_without_human_mot_ground_truth",
            )
            behavior_report = session.exec(
                select(BehaviorReport).where(
                    BehaviorReport.source_sha256 == source_sha256
                )
            ).first()
            if not behavior_report:
                session.add(BehaviorReport(**report_values(report_in)))

            provenance = report.get("provenance", {})
            group = report.get("group", {})
            flux = group.get("flux", {}) if isinstance(group, dict) else {}
            result = AnalysisResult(
                task_id=task.id,
                video_id=task.video_id,
                owner_id=task.owner_id,
                detected_individuals=metrics["detection_count"],
                valid_tracks=metrics["track_count"],
                entry_count=metrics["entry_count"] or 0,
                exit_count=metrics["exit_count"] or 0,
                average_speed=metrics["average_speed"],
                activity_index=metrics["activity_index"],
                abnormal_event_count=int(worker_result.get("anomaly_window_count", 0)),
                metrics_json=json.dumps(
                    {
                        "source": "real_analysis_worker",
                        "report_sha256": source_sha256,
                        "metric_status": report_in.metric_status,
                        "provenance": provenance,
                        "mean_active_tracks_per_frame": metrics[
                            "mean_active_tracks_per_frame"
                        ],
                        "flux_status": flux.get("status")
                        if isinstance(flux, dict)
                        else None,
                    },
                    ensure_ascii=False,
                    separators=(",", ":"),
                ),
                result_video_path=worker_result.get("result_video_path"),
                result_json_path=str(resolved_report_path),
            )
            session.add(result)
            task.status = "COMPLETED"
            task.progress = 100
            task.completed_at = datetime.now(UTC)
            video.status = "COMPLETED"
            session.add(task)
            session.add(video)
            session.commit()
    except Exception as exc:
        _mark_failed(task_id, f"真实分析失败：{exc}")
