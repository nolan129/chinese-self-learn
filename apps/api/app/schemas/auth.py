from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AuthUserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    timezone: str
    created_at: datetime


class AuthSessionResponse(BaseModel):
    user: AuthUserResponse
    access_token: str
    refresh_token: str
    access_token_expires_at: datetime
    refresh_token_expires_at: datetime


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=120)
    timezone: str | None = Field(default=None, max_length=64)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=20, max_length=512)


class LogoutRequest(BaseModel):
    refresh_token: str | None = Field(default=None, max_length=512)
