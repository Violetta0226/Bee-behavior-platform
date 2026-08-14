import uuid
from datetime import UTC, datetime

from pydantic import EmailStr
from sqlalchemy import DateTime, Text
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(SQLModel):
    email: EmailStr | None = Field(default=None, max_length=255)
    is_active: bool | None = None
    is_superuser: bool | None = None
    full_name: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    items: list[Item] = Relationship(back_populates="owner", cascade_delete=True)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str
# Shared properties for videos
class VideoBase(SQLModel):
    original_filename: str = Field(
        min_length=1,
        max_length=255,
    )
    scene_type: str = Field(
        max_length=20,
        index=True,
    )
    file_size: int = Field(
        default=0,
        ge=0,
    )
    content_type: str | None = Field(
        default=None,
        max_length=100,
    )
    status: str = Field(
        default="UPLOADED",
        max_length=30,
        index=True,
    )


# Database model
class Video(VideoBase, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
    )

    stored_filename: str = Field(
        max_length=255,
        unique=True,
        index=True,
    )

    file_path: str = Field(
        max_length=1024,
    )

    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
    )

    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


# Properties returned by the API
class VideoPublic(VideoBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class VideosPublic(SQLModel):
    data: list[VideoPublic]
    count: int
# Shared properties for analysis tasks
class AnalysisTaskBase(SQLModel):
    task_type: str = Field(
        default="VIDEO_ANALYSIS",
        max_length=50,
        index=True,
    )

    status: str = Field(
        default="PENDING",
        max_length=30,
        index=True,
    )

    progress: int = Field(
        default=0,
        ge=0,
        le=100,
    )

    model_name: str | None = Field(
        default=None,
        max_length=100,
    )

    error_message: str | None = Field(
        default=None,
        max_length=1000,
    )


# Database model
class AnalysisTask(AnalysisTaskBase, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
    )

    video_id: uuid.UUID = Field(
        foreign_key="video.id",
        nullable=False,
        ondelete="CASCADE",
        index=True,
    )

    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
        index=True,
    )

    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

    started_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

    completed_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

class AnalysisTaskCreate(SQLModel):
    video_id: uuid.UUID

    model_name: str | None = Field(
        default=None,
        max_length=100,
    )
# Properties returned by the API
class AnalysisTaskPublic(AnalysisTaskBase):
    id: uuid.UUID
    video_id: uuid.UUID
    owner_id: uuid.UUID

    created_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None


class AnalysisTasksPublic(SQLModel):
    data: list[AnalysisTaskPublic]
    count: int
# Shared properties for analysis results
class AnalysisResultBase(SQLModel):
    # 检测到的蜜蜂个体数量
    detected_individuals: int = Field(
        default=0,
        ge=0,
    )

    # 有效连续轨迹数量
    valid_tracks: int = Field(
        default=0,
        ge=0,
    )

    # 进巢数量
    entry_count: int = Field(
        default=0,
        ge=0,
    )

    # 出巢数量
    exit_count: int = Field(
        default=0,
        ge=0,
    )

    # 平均运动速度
    # 第一阶段可使用 pixel/s，
    # 后期完成尺度标定后可转换为 mm/s
    average_speed: float | None = Field(
        default=None,
    )

    # 蜂群活动指数
    activity_index: float | None = Field(
        default=None,
    )

    # 检测到的异常事件数量
    abnormal_event_count: int = Field(
        default=0,
        ge=0,
    )

    # 可扩展指标 JSON
    # 后期模型增加新指标时，
    # 不需要每次都立即修改数据库字段
    metrics_json: str | None = Field(
        default=None,
        sa_type=Text,
    )


# Database model
class AnalysisResult(
    AnalysisResultBase,
    table=True,
):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
    )

    # 一个 AnalysisTask 对应一个最终结果
    task_id: uuid.UUID = Field(
        foreign_key="analysistask.id",
        nullable=False,
        unique=True,
        index=True,
        ondelete="CASCADE",
    )

    video_id: uuid.UUID = Field(
        foreign_key="video.id",
        nullable=False,
        index=True,
        ondelete="CASCADE",
    )

    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        index=True,
        ondelete="CASCADE",
    )

    # 后续模型生成的标注视频
    result_video_path: str | None = Field(
        default=None,
        max_length=1024,
    )

    # 后续保存轨迹、逐帧结果等 JSON
    result_json_path: str | None = Field(
        default=None,
        max_length=1024,
    )

    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


# Properties returned by the API
class AnalysisResultPublic(
    AnalysisResultBase,
):
    id: uuid.UUID
    task_id: uuid.UUID
    video_id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class AnalysisResultsPublic(SQLModel):
    data: list[AnalysisResultPublic]
    count: int 
# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
