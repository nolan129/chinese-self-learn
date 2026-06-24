from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import get_settings
from app.db.models import NotificationSettings, User


async def ensure_default_user(session: AsyncSession) -> None:
    settings = get_settings()
    user = await session.scalar(select(User).where(User.id == settings.default_user_id))
    if user is None:
        user = User(
            id=settings.default_user_id,
            display_name=settings.default_user_name,
            timezone=settings.default_timezone,
            is_seed=True,
        )
        session.add(user)
        await session.flush()

    notification_settings = await session.scalar(
        select(NotificationSettings).where(NotificationSettings.user_id == settings.default_user_id)
    )
    if notification_settings is None:
        session.add(
            NotificationSettings(
                user_id=settings.default_user_id,
                timezone=settings.default_timezone,
                daily_reminder_time="21:00",
                app_push_enabled=True,
                telegram_enabled=True,
                privacy_no_source_sentence=False,
                privacy_anonymize_before_save=False,
            )
        )
    await session.commit()
