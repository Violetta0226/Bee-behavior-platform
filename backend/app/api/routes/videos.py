import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import Message, Video, VideoPublic, VideosPublic

router = APIRouter(prefix="/videos", tags=["videos"])

UPLOAD_DIR = Path(settings.VIDEO_UPLOAD_DIR)

ALLOWED_EXTENSIONS = {
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".webm",
}

ALLOWED_SCENE_TYPES = {
    "OUTDOOR",
    "INDOOR",
}


@router.get("/", response_model=VideosPublic)
def read_videos(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    获取视频列表。
    """

    if current_user.is_superuser:
        count_statement = select(func.count()).select_from(Video)
        count = session.exec(count_statement).one()

        statement = (
            select(Video)
            .order_by(col(Video.created_at).desc())
            .offset(skip)
            .limit(limit)
        )
    else:
        count_statement = (
            select(func.count())
            .select_from(Video)
            .where(Video.owner_id == current_user.id)
        )

        count = session.exec(count_statement).one()

        statement = (
            select(Video)
            .where(Video.owner_id == current_user.id)
            .order_by(col(Video.created_at).desc())
            .offset(skip)
            .limit(limit)
        )

    videos = session.exec(statement).all()

    return VideosPublic(
        data=[VideoPublic.model_validate(video) for video in videos],
        count=count,
    )


@router.post("/upload", response_model=VideoPublic)
async def upload_video(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    scene_type: str = Form(...),
    file: UploadFile = File(...),
) -> Any:
    """
    上传巢内红外或巢外可见光视频。
    """

    scene_type = scene_type.upper()

    if scene_type not in ALLOWED_SCENE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="scene_type 必须为 OUTDOOR 或 INDOOR",
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="缺少视频文件名",
        )

    extension = Path(file.filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="暂不支持该视频格式",
        )

    if file.content_type and not file.content_type.startswith("video/"):
        raise HTTPException(
            status_code=400,
            detail="上传文件不是有效的视频类型",
        )

    UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    stored_filename = f"{uuid.uuid4()}{extension}"
    destination = UPLOAD_DIR / stored_filename

    file_size = 0

    try:
        with destination.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                output.write(chunk)
                file_size += len(chunk)
                if file_size > settings.MAX_VIDEO_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="视频文件超过上传大小限制",
                    )

    except HTTPException:
        destination.unlink(missing_ok=True)
        raise

    except Exception as exc:
        if destination.exists():
            destination.unlink()

        raise HTTPException(
            status_code=500,
            detail="视频保存失败",
        ) from exc

    finally:
        await file.close()

    video = Video(
        original_filename=file.filename,
        stored_filename=stored_filename,
        file_path=str(destination),
        scene_type=scene_type,
        file_size=file_size,
        content_type=file.content_type,
        status="UPLOADED",
        owner_id=current_user.id,
    )

    try:
        session.add(video)
        session.commit()
        session.refresh(video)

    except Exception:
        session.rollback()

        if destination.exists():
            destination.unlink()

        raise

    return video


@router.get(
    "/{video_id}",
    response_model=VideoPublic,
)
def read_video(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    video_id: uuid.UUID,
) -> Any:
    """
    获取单个视频详情。
    """

    video = session.get(
        Video,
        video_id,
    )

    if not video:
        raise HTTPException(
            status_code=404,
            detail="Video not found",
        )

    if not current_user.is_superuser and video.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions",
        )

    return video


@router.get(
    "/{video_id}/file",
    response_class=FileResponse,
)
def read_video_file(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    video_id: uuid.UUID,
) -> FileResponse:
    """
    返回原始视频文件。
    """

    video = session.get(
        Video,
        video_id,
    )

    if not video:
        raise HTTPException(
            status_code=404,
            detail="Video not found",
        )

    if not current_user.is_superuser and video.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions",
        )

    file_path = Path(video.file_path)

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Video file not found",
        )

    return FileResponse(
        path=file_path,
        media_type=(video.content_type or "application/octet-stream"),
    )


@router.delete("/{video_id}")
def delete_video(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    video_id: uuid.UUID,
) -> Message:
    """
    删除视频及其数据库记录。
    """

    video = session.get(Video, video_id)

    if not video:
        raise HTTPException(
            status_code=404,
            detail="Video not found",
        )

    if not current_user.is_superuser and video.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions",
        )

    session.delete(video)
    session.commit()

    video_path = Path(video.file_path)
    try:
        video_path.unlink(missing_ok=True)
    except OSError:
        # The database remains authoritative. A failed filesystem cleanup can
        # be retried by maintenance without leaving a record pointing at a
        # missing file.
        pass

    return Message(
        message="Video deleted successfully",
    )
