from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import get_settings
from app.core.time import today_in_timezone
from app.db.models import User, UserSession
from app.db.session import get_db_session
from app.services.auth import AccessTokenPayload, decode_access_token


def get_default_user_id() -> str:
    return get_settings().default_user_id


def get_today() -> object:
    return today_in_timezone(get_settings().default_timezone)


async def get_session() -> AsyncIterator[AsyncSession]:
    async for session in get_db_session():
        yield session


async def get_auth_payload(
    authorization: str | None = Header(default=None),
) -> AccessTokenPayload:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    try:
        return decode_access_token(token, get_settings().auth_token_secret)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


async def get_current_session(
    payload: AccessTokenPayload = Depends(get_auth_payload),
    session: AsyncSession = Depends(get_session),
) -> UserSession:
    record = await session.get(UserSession, payload.session_id)
    if record is None or record.user_id != payload.user_id or record.revoked_at is not None:
        raise HTTPException(status_code=401, detail="Session is no longer active.")
    if record.expires_at < payload.expires_at:
        raise HTTPException(status_code=401, detail="Session has expired.")
    return record


async def get_current_user_id(
    current_session: UserSession = Depends(get_current_session),
) -> str:
    return current_session.user_id


async def get_current_user(
    current_session: UserSession = Depends(get_current_session),
    session: AsyncSession = Depends(get_session),
) -> User:
    user = await session.get(User, current_session.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User account was not found.")
    return user
