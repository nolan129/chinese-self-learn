from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import get_settings
from app.db.models import NotificationLog, NotificationSettings, VocabularyItem
from app.integrations.notifications.clients import ExpoPushClient, TelegramClient


def _build_message(due_count: int, channel: str) -> str:
    if channel == "telegram":
        return f"Hôm nay bạn có {due_count} từ tiếng Trung cần ôn.\nVào app để ôn lại các từ đến hạn."
    return f"Hôm nay bạn có {due_count} từ tiếng Trung cần ôn. Mở app để bắt đầu nhé."


async def get_settings_record(session: AsyncSession, user_id: str) -> NotificationSettings:
    settings = await session.scalar(
        select(NotificationSettings).where(NotificationSettings.user_id == user_id)
    )
    if settings is None:
        raise RuntimeError("Notification settings not found.")
    return settings


async def send_test_telegram(
    session: AsyncSession,
    *,
    user_id: str,
    chat_id: str | None,
) -> dict[str, str]:
    settings = get_settings()
    record = await get_settings_record(session, user_id)
    target_chat_id = chat_id or record.telegram_chat_id
    if not target_chat_id:
        raise ValueError("Telegram chat ID is required.")

    client = TelegramClient(settings.telegram_bot_token)
    message = "Hán Note test: Telegram reminder channel is configured."
    await client.send_message(target_chat_id, message)
    return {"status": "sent", "message": message}


async def register_push_token(session: AsyncSession, *, user_id: str, push_token: str) -> None:
    record = await get_settings_record(session, user_id)
    record.mobile_push_token = push_token
    record.updated_at = datetime.now(tz=UTC)
    await session.commit()


async def run_daily_reminder(session: AsyncSession, *, user_id: str, today) -> list[dict[str, str]]:
    settings = get_settings()
    record = await get_settings_record(session, user_id)
    due_items = (
        await session.scalars(
            select(VocabularyItem.id).where(
                VocabularyItem.user_id == user_id,
                VocabularyItem.status.in_(["learning", "reviewing"]),
                VocabularyItem.next_review_at.is_not(None),
                VocabularyItem.next_review_at <= today,
            )
        )
    ).all()
    if not due_items:
        return []

    channels: list[dict[str, str]] = []
    for channel in ["app_push", "telegram"]:
        already_sent = await session.scalar(
            select(NotificationLog).where(
                NotificationLog.user_id == user_id,
                NotificationLog.channel == channel,
                and_(
                    NotificationLog.sent_at >= datetime.combine(today, datetime.min.time(), tzinfo=UTC),
                    NotificationLog.sent_at < datetime.combine(today, datetime.max.time(), tzinfo=UTC),
                ),
            )
        )
        if already_sent is not None:
            channels.append({"channel": channel, "status": "skipped"})
            continue

        message = _build_message(len(due_items), "telegram" if channel == "telegram" else "push")
        failure_reason = None
        status = "sent"
        try:
            if channel == "app_push":
                if record.app_push_enabled and record.mobile_push_token:
                    await ExpoPushClient(settings.expo_push_url).send_push(record.mobile_push_token, message)
                else:
                    status = "skipped"
            elif channel == "telegram":
                if record.telegram_enabled and record.telegram_chat_id:
                    await TelegramClient(settings.telegram_bot_token).send_message(
                        record.telegram_chat_id, message
                    )
                else:
                    status = "skipped"
        except Exception as exc:  # noqa: BLE001
            status = "failed"
            failure_reason = str(exc)

        session.add(
            NotificationLog(
                user_id=user_id,
                channel=channel,
                status=status,
                due_vocab_count=len(due_items),
                message_preview=message,
                failure_reason=failure_reason,
            )
        )
        channels.append({"channel": channel, "status": status})

    await session.commit()
    return channels
