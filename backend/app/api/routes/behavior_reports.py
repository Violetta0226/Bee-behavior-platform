# pyright: reportInvalidTypeForm=false, reportMissingImports=false

import math
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.models import (
    BehaviorReport,
    BehaviorReportDetail,
    BehaviorReportImport,
    BehaviorReportPublic,
    BehaviorReportsPublic,
)

router = APIRouter(prefix="/behavior-reports", tags=["behavior-reports"])

_ANOMALY_FIELDS = (
    "activity_robust_z",
    "speed_body_lengths_robust_z",
    "interaction_robust_z",
    "flux_robust_z",
)
_ANOMALY_THRESHOLD = 3.5


def _unprocessable(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=detail
    )


def _mapping(container: dict[str, Any], key: str) -> dict[str, Any]:
    value = container.get(key)
    if not isinstance(value, dict):
        raise _unprocessable(f"report.{key} must be an object")
    return value


def _required_text(container: dict[str, Any], key: str, max_length: int) -> str:
    value = container.get(key)
    if not isinstance(value, str) or not value.strip():
        raise _unprocessable(f"report.{key} must be a non-empty string")
    value = value.strip()
    if len(value) > max_length:
        raise _unprocessable(f"report.{key} exceeds {max_length} characters")
    return value


def _non_negative_int(container: dict[str, Any], key: str) -> int:
    value = container.get(key)
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise _unprocessable(f"report.sequence.{key} must be a non-negative integer")
    return value


def _optional_non_negative_int(container: dict[str, Any], key: str) -> int | None:
    value = container.get(key)
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise _unprocessable(f"report.group.flux.{key} must be null or non-negative")
    return value


def _duration_seconds(sequence: dict[str, Any]) -> float:
    value = sequence.get("duration_seconds")
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise _unprocessable("report.sequence.duration_seconds must be numeric")
    duration = float(value)
    if not math.isfinite(duration) or duration < 0:
        raise _unprocessable(
            "report.sequence.duration_seconds must be finite and non-negative"
        )
    return duration


def _anomaly_window_count(group: dict[str, Any]) -> int:
    temporal = group.get("temporal_summary", [])
    if not isinstance(temporal, list):
        raise _unprocessable("report.group.temporal_summary must be an array")
    count = 0
    for row in temporal:
        if not isinstance(row, dict):
            raise _unprocessable("report.group.temporal_summary rows must be objects")
        if row.get("warmup", False) is True:
            continue
        scores: list[float] = []
        for field in _ANOMALY_FIELDS:
            value = row.get(field)
            if value is None:
                continue
            if isinstance(value, bool) or not isinstance(value, int | float):
                raise _unprocessable(
                    f"temporal_summary.{field} must be numeric or null"
                )
            score = float(value)
            if not math.isfinite(score):
                raise _unprocessable(f"temporal_summary.{field} must be finite")
            scores.append(abs(score))
        if scores and max(scores) >= _ANOMALY_THRESHOLD:
            count += 1
    return count


def report_values(report_in: BehaviorReportImport) -> dict[str, Any]:
    report = report_in.report
    sequence = _mapping(report, "sequence")
    group = _mapping(report, "group")
    flux = _mapping(group, "flux")
    source = report_in.source_path
    if source is None and report.get("source") is not None:
        if not isinstance(report["source"], str) or len(report["source"]) > 1024:
            raise _unprocessable("report.source must be a string up to 1024 characters")
        source = report["source"]
    return {
        "sequence_id": _required_text(report, "sequence_id", 255),
        "schema_version": _required_text(report, "schema_version", 32),
        "source": source,
        "source_sha256": report_in.source_sha256.lower(),
        "modality": report_in.modality,
        "model_version": report_in.model_version,
        "ground_truth_version": report_in.ground_truth_version,
        "metric_status": report_in.metric_status,
        "duration_seconds": _duration_seconds(sequence),
        "detection_count": _non_negative_int(sequence, "detection_count"),
        "track_count": _non_negative_int(sequence, "track_count"),
        "entry_count": _optional_non_negative_int(flux, "entry_count"),
        "exit_count": _optional_non_negative_int(flux, "exit_count"),
        "anomaly_window_count": _anomaly_window_count(group),
        "payload": report,
    }


@router.get("/", response_model=BehaviorReportsPublic)
def read_behavior_reports(
    session: SessionDep,
    _current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    count = session.exec(select(func.count()).select_from(BehaviorReport)).one()
    statement = (
        select(BehaviorReport)
        .order_by(col(BehaviorReport.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    reports = session.exec(statement).all()
    return BehaviorReportsPublic(
        data=[BehaviorReportPublic.model_validate(report) for report in reports],
        count=count,
    )


@router.get("/latest", response_model=BehaviorReportDetail)
def read_latest_behavior_report(
    session: SessionDep,
    _current_user: CurrentUser,
) -> Any:
    report = session.exec(
        select(BehaviorReport).order_by(col(BehaviorReport.created_at).desc())
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Behavior report not found")
    return report


@router.get("/{report_id}", response_model=BehaviorReportDetail)
def read_behavior_report(
    report_id: str,
    session: SessionDep,
    _current_user: CurrentUser,
) -> Any:
    try:
        parsed_id = uuid.UUID(report_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=404, detail="Behavior report not found"
        ) from exc
    report = session.get(BehaviorReport, parsed_id)
    if not report:
        raise HTTPException(status_code=404, detail="Behavior report not found")
    return report


@router.post(
    "/import",
    response_model=BehaviorReportDetail,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_active_superuser)],
)
def import_behavior_report(
    report_in: BehaviorReportImport,
    session: SessionDep,
) -> Any:
    existing = session.exec(
        select(BehaviorReport).where(
            BehaviorReport.source_sha256 == report_in.source_sha256.lower()
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Behavior report with this source SHA-256 already exists",
        )
    report = BehaviorReport(**report_values(report_in))
    session.add(report)
    session.commit()
    session.refresh(report)
    return report
