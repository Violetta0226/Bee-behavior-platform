import time
import uuid
from datetime import UTC, datetime

from sqlmodel import Session, select

from app.core.db import engine
from app.models import (
    AnalysisResult,
    AnalysisTask,
    Video,
)


def run_analysis_pipeline(
    task_id: uuid.UUID,
) -> None:
    """
    蜜蜂视频分析主流程。

    当前阶段：
    使用模拟分析结果验证完整业务链。

    下一阶段：
    将模拟部分逐步替换为
    YOLO 检测、Tracking 和行为分析。
    """

    with Session(engine) as session:
        task = session.get(
            AnalysisTask,
            task_id,
        )

        if not task:
            return

        video = session.get(
            Video,
            task.video_id,
        )

        try:
            # =========================
            # 1. 开始分析
            # =========================
            task.status = "PROCESSING"
            task.progress = 10
            task.started_at = datetime.now(UTC)
            task.error_message = None

            session.add(task)

            if video:
                video.status = "PROCESSING"
                session.add(video)

            session.commit()

            # =========================
            # 2. 模拟模型分析
            # =========================
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

            # =========================
            # 3. 重新读取任务
            # =========================
            task = session.get(
                AnalysisTask,
                task_id,
            )

            if not task:
                return

            video = session.get(
                Video,
                task.video_id,
            )

            # =========================
            # 4. 检查已有分析结果
            # =========================
            existing_result = session.exec(
                select(AnalysisResult).where(
                    AnalysisResult.task_id
                    == task.id
                )
            ).first()

            # =========================
            # 5. 保存模拟分析结果
            # =========================
            if not existing_result:
                result = AnalysisResult(
                    task_id=task.id,
                    video_id=task.video_id,
                    owner_id=task.owner_id,

                    detected_individuals=126,
                    valid_tracks=84,

                    entry_count=32,
                    exit_count=29,

                    average_speed=18.6,
                    activity_index=0.73,

                    abnormal_event_count=2,

                    metrics_json=(
                        '{"source":"simulation",'
                        '"model":"baseline-v1",'
                        '"note":"mock analysis result"}'
                    ),

                    result_video_path=None,
                    result_json_path=None,
                )

                session.add(result)

            # =========================
            # 6. 完成分析任务
            # =========================
            task.status = "COMPLETED"
            task.progress = 100
            task.completed_at = datetime.now(UTC)

            session.add(task)

            if video:
                video.status = "COMPLETED"
                session.add(video)

            session.commit()

        except Exception as exc:
            # =========================
            # 7. 异常处理
            # =========================
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

                video = session.get(
                    Video,
                    task.video_id,
                )

                if video:
                    video.status = "FAILED"
                    session.add(video)

                session.commit()