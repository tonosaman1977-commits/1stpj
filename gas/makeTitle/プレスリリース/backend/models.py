import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import relationship

from database import Base


def _uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = 'users'

    id = Column(String, primary_key=True, default=_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default='user', nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    themes = relationship('PostTheme', back_populates='user', cascade='all, delete-orphan')
    schedules = relationship('ScheduleSlot', back_populates='user', cascade='all, delete-orphan')
    histories = relationship('PostHistory', back_populates='user', cascade='all, delete-orphan')
    sns_connections = relationship('SnsConnection', back_populates='user', cascade='all, delete-orphan')
    post_queue = relationship('PostQueue', back_populates='user', cascade='all, delete-orphan')


class PostTheme(Base):
    __tablename__ = 'post_themes'

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship('User', back_populates='themes')
    histories = relationship('PostHistory', back_populates='theme')


class ScheduleSlot(Base):
    __tablename__ = 'schedule_slots'

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    time = Column(String, nullable=False)  # HH:MM
    enabled = Column(Boolean, default=True, nullable=False)

    user = relationship('User', back_populates='schedules')


class PostHistory(Base):
    __tablename__ = 'post_histories'

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    theme_id = Column(String, ForeignKey('post_themes.id'), nullable=True)
    theme_name = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    posted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(String, nullable=False)  # 'success' | 'failed'
    error_message = Column(Text, nullable=True)

    user = relationship('User', back_populates='histories')
    theme = relationship('PostTheme', back_populates='histories')


class SnsConnection(Base):
    __tablename__ = 'sns_connections'
    __table_args__ = (Index('ix_sns_connections_user_platform', 'user_id', 'platform'),)

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    platform = Column(String, nullable=False)  # 'threads'
    sns_user_id = Column(String, nullable=False)
    access_token_encrypted = Column(Text, nullable=False)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    is_expired = Column(Boolean, default=False, nullable=False)
    connected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship('User', back_populates='sns_connections')


class PostQueue(Base):
    """下書き・承認済み投稿キュー。
    status: draft → approved → posted | failed | cancelled
    """
    __tablename__ = 'post_queue'
    __table_args__ = (Index('ix_post_queue_user_status', 'user_id', 'status'),)

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    theme_id = Column(String, ForeignKey('post_themes.id'), nullable=True)
    theme_name = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    status = Column(String, default='draft', nullable=False)  # draft|approved|posted|failed|cancelled
    scheduled_at = Column(DateTime(timezone=True), nullable=True)  # 承認時にセット
    posted_at = Column(DateTime(timezone=True), nullable=True)
    threads_post_id = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(String, default='0', nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship('User', back_populates='post_queue')
    theme = relationship('PostTheme')


class BuzzReference(Base):
    """バズりリファレンス投稿（ユーザーごとに最大5件）。"""
    __tablename__ = 'buzz_references'
    __table_args__ = (Index('ix_buzz_references_user_slot', 'user_id', 'slot_index'),)

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    slot_index = Column(String, nullable=False)  # '0'〜'4'
    label = Column(String, nullable=False, default='')
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship('User')
