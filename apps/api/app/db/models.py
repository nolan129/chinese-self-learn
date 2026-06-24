from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(tz=UTC)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_name: Mapped[str] = mapped_column(String(120))
    timezone: Mapped[str] = mapped_column(String(64))
    is_seed: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    refresh_token_hash: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class VocabularyItem(Base):
    __tablename__ = "vocabulary_items"
    __table_args__ = (
        UniqueConstraint("user_id", "normalized_word", "pinyin", name="uq_vocab_user_word_pinyin"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    word: Mapped[str] = mapped_column(String(120))
    normalized_word: Mapped[str] = mapped_column(String(120))
    pinyin: Mapped[str] = mapped_column(String(120))
    meaning_vi: Mapped[str] = mapped_column(Text)
    meaning_in_context_vi: Mapped[str] = mapped_column(Text)
    part_of_speech: Mapped[str] = mapped_column(String(60))
    usage_note_vi: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="learning")
    difficulty: Mapped[str] = mapped_column(String(20), default="medium")
    review_stage: Mapped[int] = mapped_column(Integer, default=0)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    successful_review_count: Mapped[int] = mapped_column(Integer, default=0)
    memory_strength: Mapped[int] = mapped_column(Integer, default=0)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_review_at: Mapped[date | None] = mapped_column(Date, index=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    examples: Mapped[list["VocabularyExample"]] = relationship(
        back_populates="vocabulary_item", cascade="all, delete-orphan"
    )


class VocabularyExample(Base):
    __tablename__ = "vocabulary_examples"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vocab_id: Mapped[str] = mapped_column(ForeignKey("vocabulary_items.id"))
    source_sentence_zh: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_sentence_vi: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_zh: Mapped[str] = mapped_column(Text)
    example_pinyin: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_vi: Mapped[str] = mapped_column(Text)
    is_user_source: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    vocabulary_item: Mapped["VocabularyItem"] = relationship(back_populates="examples")


class ReviewLog(Base):
    __tablename__ = "review_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    vocab_id: Mapped[str] = mapped_column(ForeignKey("vocabulary_items.id"))
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    result: Mapped[str] = mapped_column(String(20))
    previous_stage: Mapped[int] = mapped_column(Integer)
    next_stage: Mapped[int] = mapped_column(Integer)
    next_review_at: Mapped[date] = mapped_column(Date)


class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    timezone: Mapped[str] = mapped_column(String(64))
    daily_reminder_time: Mapped[str] = mapped_column(String(5), default="21:00")
    app_push_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    telegram_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    telegram_chat_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    mobile_push_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    privacy_no_source_sentence: Mapped[bool] = mapped_column(Boolean, default=False)
    privacy_anonymize_before_save: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    channel: Mapped[str] = mapped_column(String(20))
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    status: Mapped[str] = mapped_column(String(20))
    due_vocab_count: Mapped[int] = mapped_column(Integer)
    message_preview: Mapped[str] = mapped_column(Text)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
