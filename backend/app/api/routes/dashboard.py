from fastapi import APIRouter
from sqlmodel import col, select

from app.api.deps import CurrentUser, SessionDep
from app.models import BehaviorReport, DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def read_dashboard_summary(
    session: SessionDep,
    _current_user: CurrentUser,
) -> DashboardSummary:
    reports = session.exec(
        select(BehaviorReport).order_by(col(BehaviorReport.created_at).desc())
    ).all()
    return DashboardSummary(
        video_count=len({report.sequence_id for report in reports}),
        analysis_report_count=len(reports),
        tracked_individual_count=sum(report.track_count for report in reports),
        anomaly_window_count=sum(report.anomaly_window_count for report in reports),
        entry_count=sum(report.entry_count or 0 for report in reports),
        exit_count=sum(report.exit_count or 0 for report in reports),
        latest_report_at=reports[0].created_at if reports else None,
    )
