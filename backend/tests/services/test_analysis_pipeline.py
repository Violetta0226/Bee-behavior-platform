from app.api.routes.behavior_reports import report_values
from app.models import BehaviorReportImport
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
