from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import Settings, get_settings
from app.db.models import NotificationSettings, NotificationLog, ReviewLog, User, UserSession, VocabularyItem


@dataclass(frozen=True, slots=True)
class AccessTokenPayload:
    user_id: str
    session_id: str
    expires_at: datetime


def _urlsafe_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _urlsafe_decode(value: str) -> bytes:
    padding = "=" * ((4 - len(value) % 4) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}")


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${_urlsafe_encode(salt)}${_urlsafe_encode(digest)}"


def verify_password(password: str, encoded: str | None) -> bool:
    if not encoded:
        return False
    try:
        algorithm, salt_b64, digest_b64 = encoded.split("$", 2)
    except ValueError:
        return False
    if algorithm != "scrypt":
        return False
    salt = _urlsafe_decode(salt_b64)
    expected = _urlsafe_decode(digest_b64)
    actual = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return hmac.compare_digest(actual, expected)


def create_access_token(
    *,
    user_id: str,
    session_id: str,
    secret: str,
    expires_at: datetime,
) -> str:
    payload = {
        "sub": user_id,
        "sid": session_id,
        "exp": int(expires_at.timestamp()),
    }
    serialized = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), serialized, hashlib.sha256).digest()
    return f"{_urlsafe_encode(serialized)}.{_urlsafe_encode(signature)}"


def decode_access_token(token: str, secret: str) -> AccessTokenPayload:
    try:
        serialized_b64, signature_b64 = token.split(".", 1)
    except ValueError as exc:
        raise ValueError("Invalid access token format.") from exc
    serialized = _urlsafe_decode(serialized_b64)
    expected_signature = hmac.new(secret.encode("utf-8"), serialized, hashlib.sha256).digest()
    actual_signature = _urlsafe_decode(signature_b64)
    if not hmac.compare_digest(expected_signature, actual_signature):
        raise ValueError("Access token signature is invalid.")
    payload = json.loads(serialized.decode("utf-8"))
    expires_at = datetime.fromtimestamp(int(payload["exp"]), tz=UTC)
    if expires_at <= datetime.now(tz=UTC):
        raise ValueError("Access token has expired.")
    return AccessTokenPayload(user_id=payload["sub"], session_id=payload["sid"], expires_at=expires_at)


def _hash_refresh_token(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _resolved_timezone(timezone: str | None) -> str:
    return timezone or get_settings().default_timezone


async def resolve_user_timezone(session: AsyncSession, user_id: str) -> str:
    record = await session.scalar(
        select(NotificationSettings.timezone).where(NotificationSettings.user_id == user_id)
    )
    if record:
        return record
    user = await session.get(User, user_id)
    if user is not None:
        return user.timezone
    return get_settings().default_timezone


def _is_first_real_user_statement() -> object:
    return select(func.count()).select_from(User).where(User.is_seed.is_(False))


async def _create_default_notification_settings(
    session: AsyncSession,
    *,
    user_id: str,
    timezone: str,
) -> NotificationSettings:
    record = NotificationSettings(
        user_id=user_id,
        timezone=timezone,
        daily_reminder_time="21:00",
        app_push_enabled=True,
        telegram_enabled=True,
        privacy_no_source_sentence=False,
        privacy_anonymize_before_save=False,
    )
    session.add(record)
    await session.flush()
    return record


async def _migrate_seed_data(
    session: AsyncSession,
    *,
    seed_user_id: str,
    target_user_id: str,
    timezone: str,
) -> None:
    await session.execute(
        update(VocabularyItem)
        .where(VocabularyItem.user_id == seed_user_id)
        .values(user_id=target_user_id)
    )
    await session.execute(
        update(ReviewLog)
        .where(ReviewLog.user_id == seed_user_id)
        .values(user_id=target_user_id)
    )
    await session.execute(
        update(NotificationLog)
        .where(NotificationLog.user_id == seed_user_id)
        .values(user_id=target_user_id)
    )

    settings_record = await session.scalar(
        select(NotificationSettings).where(NotificationSettings.user_id == seed_user_id)
    )
    if settings_record is None:
        await _create_default_notification_settings(session, user_id=target_user_id, timezone=timezone)
    else:
        settings_record.user_id = target_user_id
        settings_record.timezone = timezone


def _issue_session_tokens(
    *,
    user: User,
    session_id: str,
    refresh_token: str,
    access_expires_at: datetime,
    refresh_expires_at: datetime,
    settings: Settings,
) -> dict[str, object]:
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "timezone": user.timezone,
            "created_at": user.created_at,
        },
        "access_token": create_access_token(
            user_id=user.id,
            session_id=session_id,
            secret=settings.auth_token_secret,
            expires_at=access_expires_at,
        ),
        "refresh_token": refresh_token,
        "access_token_expires_at": access_expires_at,
        "refresh_token_expires_at": refresh_expires_at,
    }


async def _create_user_session(
    session: AsyncSession,
    *,
    user: User,
    settings: Settings,
) -> dict[str, object]:
    now = datetime.now(tz=UTC)
    access_expires_at = now + timedelta(minutes=settings.auth_access_token_ttl_minutes)
    refresh_expires_at = now + timedelta(days=settings.auth_refresh_token_ttl_days)
    refresh_token = secrets.token_urlsafe(48)
    session_id = str(uuid.uuid4())
    session.add(
        UserSession(
            id=session_id,
            user_id=user.id,
            refresh_token_hash=_hash_refresh_token(refresh_token),
            expires_at=refresh_expires_at,
            last_used_at=now,
        )
    )
    user.last_login_at = now
    await session.flush()
    return _issue_session_tokens(
        user=user,
        session_id=session_id,
        refresh_token=refresh_token,
        access_expires_at=access_expires_at,
        refresh_expires_at=refresh_expires_at,
        settings=settings,
    )


async def register_user(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    display_name: str,
    timezone: str | None,
) -> dict[str, object]:
    settings = get_settings()
    normalized_email = _normalize_email(email)
    existing = await session.scalar(select(User).where(User.email == normalized_email))
    if existing is not None:
        raise ValueError("Email is already registered.")

    real_user_count = int((await session.scalar(_is_first_real_user_statement())) or 0)
    resolved_timezone = _resolved_timezone(timezone)
    user = User(
        id=str(uuid.uuid4()),
        email=normalized_email,
        password_hash=hash_password(password),
        display_name=display_name.strip(),
        timezone=resolved_timezone,
        is_seed=False,
    )
    session.add(user)
    await session.flush()

    if real_user_count == 0:
        await _migrate_seed_data(
            session,
            seed_user_id=settings.default_user_id,
            target_user_id=user.id,
            timezone=resolved_timezone,
        )
    else:
        await _create_default_notification_settings(session, user_id=user.id, timezone=resolved_timezone)

    tokens = await _create_user_session(session, user=user, settings=settings)
    await session.commit()
    return tokens


async def login_user(
    session: AsyncSession,
    *,
    email: str,
    password: str,
) -> dict[str, object]:
    settings = get_settings()
    normalized_email = _normalize_email(email)
    user = await session.scalar(select(User).where(User.email == normalized_email, User.is_seed.is_(False)))
    if user is None or not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password.")
    tokens = await _create_user_session(session, user=user, settings=settings)
    await session.commit()
    return tokens


async def refresh_user_session(
    session: AsyncSession,
    *,
    refresh_token: str,
) -> dict[str, object]:
    settings = get_settings()
    token_hash = _hash_refresh_token(refresh_token)
    record = await session.scalar(
        select(UserSession).where(UserSession.refresh_token_hash == token_hash)
    )
    if record is None or record.revoked_at is not None or record.expires_at <= datetime.now(tz=UTC):
        raise ValueError("Refresh token is invalid or expired.")
    user = await session.get(User, record.user_id)
    if user is None:
        raise ValueError("User account was not found.")

    now = datetime.now(tz=UTC)
    next_refresh_token = secrets.token_urlsafe(48)
    access_expires_at = now + timedelta(minutes=settings.auth_access_token_ttl_minutes)
    refresh_expires_at = now + timedelta(days=settings.auth_refresh_token_ttl_days)
    record.refresh_token_hash = _hash_refresh_token(next_refresh_token)
    record.expires_at = refresh_expires_at
    record.last_used_at = now
    user.last_login_at = now
    await session.flush()
    await session.commit()
    return _issue_session_tokens(
        user=user,
        session_id=record.id,
        refresh_token=next_refresh_token,
        access_expires_at=access_expires_at,
        refresh_expires_at=refresh_expires_at,
        settings=settings,
    )


async def logout_user_session(
    session: AsyncSession,
    *,
    refresh_token: str | None,
    current_session_id: str | None,
) -> None:
    record: UserSession | None = None
    if refresh_token:
        record = await session.scalar(
            select(UserSession).where(UserSession.refresh_token_hash == _hash_refresh_token(refresh_token))
        )
    elif current_session_id:
        record = await session.get(UserSession, current_session_id)

    if record is not None and record.revoked_at is None:
        record.revoked_at = datetime.now(tz=UTC)
        record.last_used_at = datetime.now(tz=UTC)
        await session.commit()
