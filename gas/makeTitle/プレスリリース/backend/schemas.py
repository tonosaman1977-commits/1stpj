from typing import Optional

from pydantic import BaseModel, field_validator


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


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
