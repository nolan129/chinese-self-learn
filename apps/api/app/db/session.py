from __future__ import annotations

from collections.abc import AsyncIterator
import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.settings import get_settings

settings = get_settings()
if os.getenv("HAN_NOTE_SKIP_DB_ENGINE") == "1":
    engine = None
    SessionLocal = None
else:
    engine = create_async_engine(settings.database_url, future=True)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db_session() -> AsyncIterator[AsyncSession]:
    if SessionLocal is None:
        raise RuntimeError("Database session is not configured.")
    async with SessionLocal() as session:
        yield session
