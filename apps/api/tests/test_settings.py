from __future__ import annotations

from app.core.settings import Settings


def test_local_network_origin_is_allowed_by_regex() -> None:
    settings = Settings()

    assert settings.is_cors_origin_allowed("http://192.168.1.9:3001") is True
    assert settings.is_cors_origin_allowed("http://10.0.0.25:3001") is True
    assert settings.is_cors_origin_allowed("http://172.20.10.4:19006") is True


def test_public_origin_is_not_allowed_by_regex() -> None:
    settings = Settings()

    assert settings.is_cors_origin_allowed("https://example.com") is False
