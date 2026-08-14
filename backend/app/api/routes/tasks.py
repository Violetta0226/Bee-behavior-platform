import time
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlmodel import Session, col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.db import engine
from app.models import (
    AnalysisTask,
    AnalysisTaskCreate,
    AnalysisTaskPublic,
    AnalysisTasksPublic,
    Video,
)

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"],
)


def run_fake_analysis(task_id: uuid.UUID) -> None:
    """
    第一阶段使用模拟分析任务。

    后续接入 YOLO、Tracking 等模型时，
    只需要替换这个函数内部逻辑。
    """

    with Session(engine) as session:
        task = session.get(
            AnalysisTask,
            task_id,
        )

        if not task:
            return

        try:
            task.status = "PROCESSING"
            task.progress = 10
            task.started_at = datetime.now(UTC)

            session.add(task)
            session.commit()

            # 模拟模型处理过程
            for progress in [
                25,
                45,
                65,
                85,
                100,
            ]:
                time.sleep(2)

                task = session.get(
                    AnalysisTask,
                    task_id,
                )

                if not task:
                    return

                task.progress = progress

                session.add(task)
                session.commit()

            task = session.get(
                AnalysisTask,
                task_id,
            )

            if not task:
                return

            task.status = "COMPLETED"
            task.progress = 100
            task.completed_at = datetime.now(UTC)

            session.add(task)
            session.commit()

        except Exception as exc:
            session.rollback()

            task = session.get(
                AnalysisTask,
                task_id,
            )

            if task:
                task.status = "FAILED"
                task.error_message = str(exc)
                task.completed_at = datetime.now(UTC)

                session.add(task)
                session.commit()


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
        and video.owner_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions",
        )

    # 防止同一个视频同时创建多个正在运行的任务
    active_statement = (
        select(AnalysisTask)
        .where(
            AnalysisTask.video_id
            == task_in.video_id
        )
        .where(
            AnalysisTask.status.in_(
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

    background_tasks.add_task(
        run_fake_analysis,
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
        and task.owner_id
        != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions",
        )

    return task