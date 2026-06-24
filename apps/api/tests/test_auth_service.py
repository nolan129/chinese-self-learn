from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from app.services.auth import create_access_token, decode_access_token, hash_password, verify_password


def test_password_hash_verifies_and_uses_salt() -> None:
    first_hash = hash_password("test-password-123")
    second_hash = hash_password("test-password-123")

    assert first_hash != second_hash
    assert verify_password("test-password-123", first_hash) is True
    assert verify_password("wrong-password", first_hash) is False


def test_access_token_round_trip_decodes_expected_payload() -> None:
    expires_at = datetime.now(tz=UTC).replace(microsecond=0) + timedelta(minutes=5)
    token = create_access_token(
        user_id="user-123",
        session_id="session-456",
        secret="demo-secret",
        expires_at=expires_at,
    )

    payload = decode_access_token(token, "demo-secret")

    assert payload.user_id == "user-123"
    assert payload.session_id == "session-456"
    assert payload.expires_at == expires_at


def test_access_token_rejects_tampered_signature() -> None:
    expires_at = datetime.now(tz=UTC) + timedelta(minutes=5)
    token = create_access_token(
        user_id="user-123",
        session_id="session-456",
        secret="demo-secret",
        expires_at=expires_at,
    )
    tampered = f"{token[:-1]}A"

    with pytest.raises(ValueError, match="signature"):
        decode_access_token(tampered, "demo-secret")


def test_access_token_rejects_expired_tokens() -> None:
    token = create_access_token(
        user_id="user-123",
        session_id="session-456",
        secret="demo-secret",
        expires_at=datetime.now(tz=UTC) - timedelta(seconds=1),
    )

    with pytest.raises(ValueError, match="expired"):
        decode_access_token(token, "demo-secret")
