from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes import router
from app.core.settings import get_settings
from app.db.bootstrap import ensure_default_user
from app.db.session import SessionLocal

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        if SessionLocal is not None:
            async with SessionLocal() as session:
                await ensure_default_user(session)
    except SQLAlchemyError:
        # The API should still start when the database is unavailable so healthz remains inspectable.
        pass
    yield


app = FastAPI(title=settings.app_name, debug=settings.app_debug, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_origin_regex=settings.cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
