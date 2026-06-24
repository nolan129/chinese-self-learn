from __future__ import annotations

import re
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="Han Note API", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_debug: bool = Field(default=True, alias="APP_DEBUG")
    database_url: str = Field(
        default="postgresql+asyncpg://han_note:han_note@localhost:5432/han_note",
        alias="DATABASE_URL",
    )
    default_user_id: str = Field(
        default="00000000-0000-0000-0000-000000000001",
        alias="DEFAULT_USER_ID",
    )
    default_user_name: str = Field(default="Han Note MVP User", alias="DEFAULT_USER_NAME")
    default_timezone: str = Field(default="Asia/Bangkok", alias="DEFAULT_TIMEZONE")
    ai_provider: str = Field(default="dev", alias="AI_PROVIDER")
    ai_api_url: str | None = Field(default=None, alias="AI_API_URL")
    ai_api_key: str | None = Field(default=None, alias="AI_API_KEY")
    ai_model: str | None = Field(default=None, alias="AI_MODEL")
    ai_timeout_seconds: float = Field(default=20.0, alias="AI_TIMEOUT_SECONDS")
    ai_max_retries: int = Field(default=1, alias="AI_MAX_RETRIES")
    auth_token_secret: str = Field(default="han-note-dev-secret", alias="AUTH_TOKEN_SECRET")
    auth_access_token_ttl_minutes: int = Field(default=720, alias="AUTH_ACCESS_TOKEN_TTL_MINUTES")
    auth_refresh_token_ttl_days: int = Field(default=30, alias="AUTH_REFRESH_TOKEN_TTL_DAYS")
    telegram_bot_token: str | None = Field(default=None, alias="TELEGRAM_BOT_TOKEN")
    expo_push_url: str = Field(
        default="https://exp.host/--/api/v2/push/send",
        alias="EXPO_PUSH_URL",
    )
    cors_allow_origins_raw: str = Field(
        default="http://127.0.0.1:3000,http://127.0.0.1:3001,http://localhost:3000,http://localhost:3001,http://localhost:19006,http://127.0.0.1:19006",
        alias="CORS_ALLOW_ORIGINS",
    )

    @property
    def cors_allow_origins(self) -> list[str]:
        return [
            value.strip()
            for value in self.cors_allow_origins_raw.split(",")
            if value.strip()
        ]

    @property
    def cors_allow_origin_regex(self) -> str:
        return (
            r"^https?://("
            r"localhost"
            r"|127\.0\.0\.1"
            r"|192\.168\.\d{1,3}\.\d{1,3}"
            r"|10\.\d{1,3}\.\d{1,3}\.\d{1,3}"
            r"|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}"
            r")(:\d+)?$"
        )

    def is_cors_origin_allowed(self, origin: str) -> bool:
        if origin in self.cors_allow_origins:
            return True
        return re.match(self.cors_allow_origin_regex, origin) is not None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
