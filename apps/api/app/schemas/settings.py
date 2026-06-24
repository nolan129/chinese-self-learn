from __future__ import annotations

from pydantic import BaseModel


class NotificationSettingsResponse(BaseModel):
    timezone: str
    daily_reminder_time: str
    app_push_enabled: bool
    telegram_enabled: bool
    telegram_chat_id: str | None
    mobile_push_token: str | None
    privacy_no_source_sentence: bool
    privacy_anonymize_before_save: bool


class NotificationSettingsUpdateRequest(BaseModel):
    timezone: str
    daily_reminder_time: str
    app_push_enabled: bool
    telegram_enabled: bool
    telegram_chat_id: str | None = None
    mobile_push_token: str | None = None
    privacy_no_source_sentence: bool
    privacy_anonymize_before_save: bool


class PushTokenRegisterRequest(BaseModel):
    push_token: str


class TelegramTestRequest(BaseModel):
    chat_id: str | None = None
