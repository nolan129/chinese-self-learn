from __future__ import annotations

import asyncio

from app.core.settings import get_settings
from app.core.time import today_in_timezone
from app.db.session import SessionLocal
from app.services.notifications import run_daily_reminder


async def main() -> None:
    settings = get_settings()
    async with SessionLocal() as session:
        results = await run_daily_reminder(
            session,
            user_id=settings.default_user_id,
            today=today_in_timezone(settings.default_timezone),
        )
    print(results)


if __name__ == "__main__":
    asyncio.run(main())
