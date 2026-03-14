from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str

    @field_validator('name')
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('表示名は必須です')
        return v.strip()

    @field_validator('password')
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('パスワードは8文字以上で入力してください')
        return v


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str

    model_config = {'from_attributes': True}


class LoginResponse(BaseModel):
    user: UserResponse
    token: str


# ── Themes ────────────────────────────────────────────────────────────────────

class ThemeCreate(BaseModel):
    name: str
    description: str

    @field_validator('name')
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('テーマ名は必須です')
        return v.strip()


class ThemeUpdate(BaseModel):
    name: str
    description: str


class ThemeResponse(BaseModel):
    id: str
    name: str
    description: str
    isActive: bool
    createdAt: str

    @classmethod
    def from_model(cls, m) -> 'ThemeResponse':
        return cls(
            id=m.id,
            name=m.name,
            description=m.description,
            isActive=m.is_active,
            createdAt=m.created_at.isoformat(),
        )


# ── Schedule ──────────────────────────────────────────────────────────────────

class ScheduleSlotResponse(BaseModel):
    id: str
    time: str
    enabled: bool

    model_config = {'from_attributes': True}


class ScheduleUpdateRequest(BaseModel):
    slots: list[ScheduleSlotResponse]


# ── History ───────────────────────────────────────────────────────────────────

class HistoryResponse(BaseModel):
    id: str
    themeId: Optional[str]
    themeName: str
    content: str
    postedAt: str
    status: str
    errorMessage: Optional[str]

    @classmethod
    def from_model(cls, m) -> 'HistoryResponse':
        return cls(
            id=m.id,
            themeId=m.theme_id,
            themeName=m.theme_name,
            content=m.content,
            postedAt=m.posted_at.isoformat(),
            status=m.status,
            errorMessage=m.error_message,
        )


# ── PostQueue ─────────────────────────────────────────────────────────────────

class PostQueueResponse(BaseModel):
    id: str
    themeId: Optional[str]
    themeName: Optional[str]
    content: str
    status: str  # draft|approved|posted|failed|cancelled
    scheduledAt: Optional[str]
    postedAt: Optional[str]
    threadsPostId: Optional[str]
    errorMessage: Optional[str]
    createdAt: str
    updatedAt: str

    @classmethod
    def from_model(cls, m) -> 'PostQueueResponse':
        return cls(
            id=m.id,
            themeId=m.theme_id,
            themeName=m.theme_name,
            content=m.content,
            status=m.status,
            scheduledAt=m.scheduled_at.isoformat() if m.scheduled_at else None,
            postedAt=m.posted_at.isoformat() if m.posted_at else None,
            threadsPostId=m.threads_post_id,
            errorMessage=m.error_message,
            createdAt=m.created_at.isoformat(),
            updatedAt=m.updated_at.isoformat(),
        )


class PostGenerateRequest(BaseModel):
    """AIでテキスト生成して下書き保存"""
    themeId: str


class PostCreateRequest(BaseModel):
    """手入力で下書き保存"""
    content: str
    themeId: Optional[str] = None
    themeName: Optional[str] = None

    @field_validator('content')
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('本文は必須です')
        if len(v) > 500:
            raise ValueError('本文は500文字以内で入力してください')
        return v.strip()


class PostEditRequest(BaseModel):
    """下書き・承認済み投稿の内容編集"""
    content: str

    @field_validator('content')
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('本文は必須です')
        if len(v) > 500:
            raise ValueError('本文は500文字以内で入力してください')
        return v.strip()


class PostApproveRequest(BaseModel):
    """承認 + 投稿日時の指定"""
    scheduledAt: datetime
