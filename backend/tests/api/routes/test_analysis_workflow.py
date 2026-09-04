import uuid
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlmodel import Session, delete

from app import crud
from app.api.routes import videos
from app.core.config import settings
from app.models import AnalysisResult, AnalysisTask, BehaviorReport, User, Video


def _superuser(db: Session) -> User:
    user = crud.get_user_by_email(session=db, email=settings.FIRST_SUPERUSER)
    assert user is not None
    return user


def _report(sequence_id: str = "A-5-test") -> dict:
    return {
        "schema_version": "1.0",
        "sequence_id": sequence_id,
        "source": "tracks.txt",
        "sequence": {
            "duration_seconds": 10.0,
            "detection_count": 12,
            "track_count": 3,
        },
        "individuals": [],
        "group": {
            "flux": {"entry_count": None, "exit_count": None},
            "temporal_summary": [
                {"warmup": False, "activity_robust_z": 4.0},
                {"warmup": True, "activity_robust_z": 100.0},
            ],
        },
    }


def _cleanup_analysis_records(db: Session) -> None:
    for model in (AnalysisResult, AnalysisTask, Video, BehaviorReport):
        db.exec(delete(model))
    db.commit()


def test_behavior_report_archive_and_dashboard(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    _cleanup_analysis_records(db)
    payload = {
        "report": _report(),
        "source_sha256": "a" * 64,
        "modality": "RGB",
        "model_version": "test-model",
    }

    forbidden = client.post(
        f"{settings.API_V1_STR}/behavior-reports/import",
        headers=normal_user_token_headers,
        json=payload,
    )
    assert forbidden.status_code == 403

    created = client.post(
        f"{settings.API_V1_STR}/behavior-reports/import",
        headers=superuser_token_headers,
        json=payload,
    )
    assert created.status_code == 201
    report_id = created.json()["id"]
    assert created.json()["entry_count"] is None
    assert created.json()["anomaly_window_count"] == 1

    duplicate = client.post(
        f"{settings.API_V1_STR}/behavior-reports/import",
        headers=superuser_token_headers,
        json=payload,
    )
    assert duplicate.status_code == 409

    listing = client.get(
        f"{settings.API_V1_STR}/behavior-reports/",
        headers=superuser_token_headers,
    )
    assert listing.status_code == 200
    assert listing.json()["count"] == 1
    assert listing.json()["data"][0]["sequence_id"] == "A-5-test"

    latest = client.get(
        f"{settings.API_V1_STR}/behavior-reports/latest",
        headers=superuser_token_headers,
    )
    assert latest.status_code == 200
    assert latest.json()["id"] == report_id

    detail = client.get(
        f"{settings.API_V1_STR}/behavior-reports/{report_id}",
        headers=superuser_token_headers,
    )
    assert detail.status_code == 200
    assert detail.json()["payload"]["sequence_id"] == "A-5-test"

    for missing_id in ("not-a-uuid", str(uuid.uuid4())):
        missing = client.get(
            f"{settings.API_V1_STR}/behavior-reports/{missing_id}",
            headers=superuser_token_headers,
        )
        assert missing.status_code == 404

    dashboard = client.get(
        f"{settings.API_V1_STR}/dashboard/summary",
        headers=superuser_token_headers,
    )
    assert dashboard.status_code == 200
    assert dashboard.json() | {"latest_report_at": None} == {
        "video_count": 1,
        "analysis_report_count": 1,
        "tracked_individual_count": 3,
        "anomaly_window_count": 1,
        "entry_count": 0,
        "exit_count": 0,
        "latest_report_at": None,
    }
    _cleanup_analysis_records(db)

    empty = client.get(
        f"{settings.API_V1_STR}/behavior-reports/latest",
        headers=superuser_token_headers,
    )
    assert empty.status_code == 404


def test_video_task_and_result_crud(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    normal_user_token_headers: dict[str, str],
    db: Session,
    tmp_path: Path,
) -> None:
    _cleanup_analysis_records(db)
    upload_dir = tmp_path / "uploads"
    with patch.object(videos, "UPLOAD_DIR", upload_dir):
        invalid_scene = client.post(
            f"{settings.API_V1_STR}/videos/upload",
            headers=superuser_token_headers,
            data={"scene_type": "unknown"},
            files={"file": ("sample.mp4", b"video", "video/mp4")},
        )
        assert invalid_scene.status_code == 400

        invalid_extension = client.post(
            f"{settings.API_V1_STR}/videos/upload",
            headers=superuser_token_headers,
            data={"scene_type": "OUTDOOR"},
            files={"file": ("sample.txt", b"video", "video/plain")},
        )
        assert invalid_extension.status_code == 400

        invalid_content = client.post(
            f"{settings.API_V1_STR}/videos/upload",
            headers=superuser_token_headers,
            data={"scene_type": "OUTDOOR"},
            files={"file": ("sample.mp4", b"video", "text/plain")},
        )
        assert invalid_content.status_code == 400

        with patch.object(settings, "MAX_VIDEO_UPLOAD_BYTES", 3):
            too_large = client.post(
                f"{settings.API_V1_STR}/videos/upload",
                headers=superuser_token_headers,
                data={"scene_type": "OUTDOOR"},
                files={"file": ("sample.mp4", b"video", "video/mp4")},
            )
        assert too_large.status_code == 413

        uploaded = client.post(
            f"{settings.API_V1_STR}/videos/upload",
            headers=superuser_token_headers,
            data={"scene_type": "outdoor"},
            files={"file": ("sample.mp4", b"video", "video/mp4")},
        )
        assert uploaded.status_code == 200
        video_id = uploaded.json()["id"]
        stored_path = Path(
            db.get(Video, uuid.UUID(video_id)).file_path  # type: ignore[union-attr]
        )
        assert stored_path.read_bytes() == b"video"

        listing = client.get(
            f"{settings.API_V1_STR}/videos/", headers=superuser_token_headers
        )
        assert listing.status_code == 200
        assert listing.json()["count"] == 1

        detail = client.get(
            f"{settings.API_V1_STR}/videos/{video_id}",
            headers=superuser_token_headers,
        )
        assert detail.status_code == 200
        file_response = client.get(
            f"{settings.API_V1_STR}/videos/{video_id}/file",
            headers=superuser_token_headers,
        )
        assert file_response.content == b"video"

        for suffix in ("", "/file"):
            forbidden = client.get(
                f"{settings.API_V1_STR}/videos/{video_id}{suffix}",
                headers=normal_user_token_headers,
            )
            assert forbidden.status_code == 403

        with patch("app.api.routes.tasks.run_analysis_pipeline", return_value=None):
            created_task = client.post(
                f"{settings.API_V1_STR}/tasks/",
                headers=superuser_token_headers,
                json={"video_id": video_id},
            )
        assert created_task.status_code == 200
        task_id = created_task.json()["id"]
        assert created_task.json()["model_name"] == "combined-box-detection-20260818"

        with patch("app.api.routes.tasks.run_analysis_pipeline", return_value=None):
            duplicate_task = client.post(
                f"{settings.API_V1_STR}/tasks/",
                headers=superuser_token_headers,
                json={"video_id": video_id},
            )
        assert duplicate_task.status_code == 409

        assert (
            client.get(
                f"{settings.API_V1_STR}/tasks/", headers=superuser_token_headers
            ).json()["count"]
            == 1
        )
        assert (
            client.get(
                f"{settings.API_V1_STR}/tasks/{task_id}",
                headers=superuser_token_headers,
            ).status_code
            == 200
        )
        assert (
            client.get(
                f"{settings.API_V1_STR}/tasks/{task_id}",
                headers=normal_user_token_headers,
            ).status_code
            == 403
        )
        assert (
            client.delete(
                f"{settings.API_V1_STR}/tasks/{task_id}",
                headers=superuser_token_headers,
            ).status_code
            == 409
        )

        task = db.get(AnalysisTask, uuid.UUID(task_id))
        assert task is not None
        task.status = "COMPLETED"
        result = AnalysisResult(
            task_id=task.id,
            video_id=uuid.UUID(video_id),
            owner_id=task.owner_id,
            detected_individuals=12,
            valid_tracks=3,
            metrics_json='{"source":"test"}',
        )
        db.add(task)
        db.add(result)
        db.commit()
        db.refresh(result)
        result_id = result.id

        assert (
            client.get(
                f"{settings.API_V1_STR}/results/", headers=superuser_token_headers
            ).json()["count"]
            == 1
        )
        for url in (
            f"{settings.API_V1_STR}/results/{result.id}",
            f"{settings.API_V1_STR}/results/task/{task.id}",
        ):
            assert client.get(url, headers=superuser_token_headers).status_code == 200
            assert client.get(url, headers=normal_user_token_headers).status_code == 403

        deleted_task = client.delete(
            f"{settings.API_V1_STR}/tasks/{task_id}",
            headers=superuser_token_headers,
        )
        assert deleted_task.status_code == 200
        db.expire_all()
        assert db.get(AnalysisResult, result_id) is None

        deleted_video = client.delete(
            f"{settings.API_V1_STR}/videos/{video_id}",
            headers=superuser_token_headers,
        )
        assert deleted_video.status_code == 200
        assert not stored_path.exists()

    for endpoint in (
        f"/videos/{uuid.uuid4()}",
        f"/videos/{uuid.uuid4()}/file",
        f"/tasks/{uuid.uuid4()}",
        f"/results/{uuid.uuid4()}",
        f"/results/task/{uuid.uuid4()}",
    ):
        assert (
            client.get(
                f"{settings.API_V1_STR}{endpoint}", headers=superuser_token_headers
            ).status_code
            == 404
        )
    assert (
        client.delete(
            f"{settings.API_V1_STR}/videos/{uuid.uuid4()}",
            headers=superuser_token_headers,
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"{settings.API_V1_STR}/tasks/{uuid.uuid4()}",
            headers=superuser_token_headers,
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"{settings.API_V1_STR}/tasks/",
            headers=superuser_token_headers,
            json={"video_id": str(uuid.uuid4())},
        ).status_code
        == 404
    )
    _cleanup_analysis_records(db)
