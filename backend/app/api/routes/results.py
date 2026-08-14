import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    AnalysisResult,
    AnalysisResultPublic,
    AnalysisResultsPublic,
)

router = APIRouter(
    prefix="/results",
    tags=["results"],
)


@router.get(
    "/",
    response_model=AnalysisResultsPublic,
)
def read_results(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    获取分析结果列表。
    """

    if current_user.is_superuser:
        count_statement = (
            select(func.count())
            .select_from(AnalysisResult)
        )

        statement = (
            select(AnalysisResult)
            .order_by(
                col(
                    AnalysisResult.created_at
                ).desc()
            )
            .offset(skip)
            .limit(limit)
        )

    else:
        count_statement = (
            select(func.count())
            .select_from(AnalysisResult)
            .where(
                AnalysisResult.owner_id
                == current_user.id
            )
        )

        statement = (
            select(AnalysisResult)
            .where(
                AnalysisResult.owner_id
                == current_user.id
            )
            .order_by(
                col(
                    AnalysisResult.created_at
                ).desc()
            )
            .offset(skip)
            .limit(limit)
        )

    count = session.exec(
        count_statement
    ).one()

    results = session.exec(
        statement
    ).all()

    return AnalysisResultsPublic(
        data=[
            AnalysisResultPublic.model_validate(
                result
            )
            for result in results
        ],
        count=count,
    )


@router.get(
    "/task/{task_id}",
    response_model=AnalysisResultPublic,
)
def read_result_by_task(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    task_id: uuid.UUID,
) -> Any:
    """
    根据分析任务 ID 获取结果。
    """

    statement = (
        select(AnalysisResult)
        .where(
            AnalysisResult.task_id
            == task_id
        )
    )

    result = session.exec(
        statement
    ).first()

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Analysis result not found",
        )

    if (
        not current_user.is_superuser
        and result.owner_id
        != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions",
        )

    return result


@router.get(
    "/{result_id}",
    response_model=AnalysisResultPublic,
)
def read_result(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    result_id: uuid.UUID,
) -> Any:
    """
    根据结果 ID 获取分析结果。
    """

    result = session.get(
        AnalysisResult,
        result_id,
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Analysis result not found",
        )

    if (
        not current_user.is_superuser
        and result.owner_id
        != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions",
        )

    return result