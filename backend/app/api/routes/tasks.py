import uuid
from typing import Any

from fastapi import (
    APIRouter,
    BackgroundTasks,
    HTTPException,
)
from sqlmodel import col, func, select

from app.api.deps import (
    CurrentUser,
    SessionDep,
)
from app.models import (
    AnalysisResult,
    AnalysisTask,
    AnalysisTaskCreate,
    AnalysisTaskPublic,
    AnalysisTasksPublic,
    Message,
    Video,
)
from app.services.analysis_pipeline import (
    run_analysis_pipeline,
)

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"],
)


@router.post(
    "/",
    response_model=AnalysisTaskPublic,
)
def create_task(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    task_in: AnalysisTaskCreate,
    background_tasks: BackgroundTasks,
) -> Any:
    """
    创建视频分析任务。
    """

    video = session.get(
        Video,
        task_in.video_id,
    )

    if not video:
        raise HTTPException(
            status_code=404,
            detail="Video not found",
        )

    if (
        not current_user.is_superuser
        and video.owner_id
        != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions",
        )

    # 防止同一视频同时执行多个任务
    active_statement = (
        select(AnalysisTask)
        .where(
            AnalysisTask.video_id
            == task_in.video_id
        )
        .where(
            col(
                AnalysisTask.status
            ).in_(
                [
                    "PENDING",
                    "PROCESSING",
                ]
            )
        )
    )

    active_task = session.exec(
        active_statement
    ).first()

    if active_task:
        raise HTTPException(
            status_code=409,
            detail="该视频已有正在执行的分析任务",
        )

    task = AnalysisTask(
        video_id=task_in.video_id,
        owner_id=current_user.id,
        task_type="VIDEO_ANALYSIS",
        status="PENDING",
        progress=0,
        model_name=(
            task_in.model_name
            or "baseline-v1"
        ),
    )

    session.add(task)
    session.commit()
    session.refresh(task)

    # 真正分析逻辑交给独立分析引擎
    background_tasks.add_task(
        run_analysis_pipeline,
        task.id,
    )

    return task


@router.get(
    "/",
    response_model=AnalysisTasksPublic,
)
def read_tasks(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    获取分析任务列表。
    """

    if current_user.is_superuser:
        count_statement = (
            select(func.count())
            .select_from(AnalysisTask)
        )

        statement = (
            select(AnalysisTask)
            .order_by(
                col(
                    AnalysisTask.created_at
                ).desc()
            )
            .offset(skip)
            .limit(limit)
        )

    else:
        count_statement = (
            select(func.count())
            .select_from(AnalysisTask)
            .where(
                AnalysisTask.owner_id
                == current_user.id
            )
        )

        statement = (
            select(AnalysisTask)
            .where(
                AnalysisTask.owner_id
                == current_user.id
            )
            .order_by(
                col(
                    AnalysisTask.created_at
                ).desc()
            )
            .offset(skip)
            .limit(limit)
        )

    count = session.exec(
        count_statement
    ).one()

    tasks = session.exec(
        statement
    ).all()

    return AnalysisTasksPublic(
        data=[
            AnalysisTaskPublic.model_validate(
                task
            )
            for task in tasks
        ],
        count=count,
    )


@router.get(
    "/{task_id}",
    response_model=AnalysisTaskPublic,
)
def read_task(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    task_id: uuid.UUID,
) -> Any:
    """
    获取单个分析任务。
    """

    task = session.get(
        AnalysisTask,
        task_id,
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found",
        )

    if (
        not current_user.is_superuser
        and task.owner_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions",
        )

    return task


@router.delete(
    "/{task_id}",
    response_model=Message,
)
def delete_task(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    task_id: uuid.UUID,
) -> Message:
    """
    删除分析任务及其关联分析结果。

    正在等待或执行中的任务不允许删除。
    """

    task = session.get(
        AnalysisTask,
        task_id,
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found",
        )

    if (
        not current_user.is_superuser
        and task.owner_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions",
        )

    if task.status in {
        "PENDING",
        "PROCESSING",
    }:
        raise HTTPException(
            status_code=409,
            detail="正在执行的分析任务不能删除",
        )

    result_statement = (
        select(AnalysisResult)
        .where(
            AnalysisResult.task_id
            == task.id
        )
    )

    result = session.exec(
        result_statement
    ).first()

    if result:
        session.delete(result)

    session.delete(task)
    session.commit()

    return Message(
        message="Analysis task deleted successfully",
    )