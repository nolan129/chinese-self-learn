from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_session, get_current_user, get_current_user_id, get_session
from app.core.time import today_in_timezone
from app.integrations.ai.provider import AiProvider
from app.schemas.analyze import AnalyzeRequest, AnalyzeResponse, ExplainTokensRequest, ExplainTokensResponse
from app.schemas.auth import (
    AuthSessionResponse,
    AuthUserResponse,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
)
from app.schemas.reviews import (
    ReviewSessionCompleteRequest,
    ReviewSessionCompleteResponse,
    ReviewSubmitRequest,
    ReviewSubmitResponse,
    ReviewTodayResponse,
)
from app.schemas.settings import (
    NotificationSettingsResponse,
    NotificationSettingsUpdateRequest,
    PushTokenRegisterRequest,
    TelegramTestRequest,
)
from app.schemas.vocabulary import (
    VocabularyCreateRequest,
    VocabularyDetailItem,
    VocabularyExampleCreateRequest,
    VocabularyListItem,
    VocabularyUpdateRequest,
)
from app.services.auth import login_user, logout_user_session, refresh_user_session, register_user, resolve_user_timezone
from app.services.notifications import get_settings_record, register_push_token, send_test_telegram
from app.services.reviews import get_reviews_today, submit_review_result, summarize_results
from app.services.vocabulary import (
    add_vocabulary_example,
    create_or_merge_vocabulary_items,
    get_vocabulary_detail,
    list_vocabulary,
    update_vocabulary_item,
)

router = APIRouter()
ai_provider = AiProvider()


@router.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok", "ai_provider_mode": ai_provider.runtime_mode()}


@router.post("/api/auth/register", response_model=AuthSessionResponse)
async def auth_register(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthSessionResponse:
    try:
        return AuthSessionResponse.model_validate(
            await register_user(
                session,
                email=payload.email,
                password=payload.password,
                display_name=payload.display_name,
                timezone=payload.timezone,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/api/auth/login", response_model=AuthSessionResponse)
async def auth_login(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthSessionResponse:
    try:
        return AuthSessionResponse.model_validate(
            await login_user(session, email=payload.email, password=payload.password)
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.post("/api/auth/refresh", response_model=AuthSessionResponse)
async def auth_refresh(
    payload: RefreshRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthSessionResponse:
    try:
        return AuthSessionResponse.model_validate(
            await refresh_user_session(session, refresh_token=payload.refresh_token)
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.post("/api/auth/logout")
async def auth_logout(
    payload: LogoutRequest | None = None,
    session: AsyncSession = Depends(get_session),
    current_session=Depends(get_current_session),
) -> dict[str, str]:
    await logout_user_session(
        session,
        refresh_token=payload.refresh_token if payload is not None else None,
        current_session_id=current_session.id,
    )
    return {"status": "ok"}


@router.get("/api/auth/me", response_model=AuthUserResponse)
async def auth_me(user=Depends(get_current_user)) -> AuthUserResponse:
    if not user.email:
        raise HTTPException(status_code=404, detail="User email is not available.")
    return AuthUserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        timezone=user.timezone,
        created_at=user.created_at,
    )


@router.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_text(
    payload: AnalyzeRequest,
    user_id: str = Depends(get_current_user_id),
) -> AnalyzeResponse:
    return await ai_provider.analyze_text(payload.text)


@router.post("/api/explain-tokens", response_model=ExplainTokensResponse)
async def explain_tokens(
    payload: ExplainTokensRequest,
    user_id: str = Depends(get_current_user_id),
) -> ExplainTokensResponse:
    return await ai_provider.explain_tokens(payload)


@router.post("/api/vocabulary", response_model=list[VocabularyListItem])
async def create_vocabulary(
    payload: VocabularyCreateRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> list[VocabularyListItem]:
    timezone = await resolve_user_timezone(session, user_id)
    today = today_in_timezone(timezone)
    return await create_or_merge_vocabulary_items(
        session, user_id=user_id, items=payload.items, today=today
    )


@router.get("/api/vocabulary", response_model=list[VocabularyListItem])
async def get_vocabulary(
    query: str | None = Query(default=None),
    status: str | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> list[VocabularyListItem]:
    timezone = await resolve_user_timezone(session, user_id)
    today = today_in_timezone(timezone)
    return await list_vocabulary(session, user_id=user_id, today=today, query=query, status=status)


@router.get("/api/vocabulary/{vocab_id}", response_model=VocabularyDetailItem)
async def get_vocabulary_item(
    vocab_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> VocabularyDetailItem:
    timezone = await resolve_user_timezone(session, user_id)
    today = today_in_timezone(timezone)
    item = await get_vocabulary_detail(session, user_id=user_id, vocab_id=vocab_id, today=today)
    if item is None:
        raise HTTPException(status_code=404, detail="Vocabulary item not found.")
    return item


@router.patch("/api/vocabulary/{vocab_id}", response_model=VocabularyDetailItem)
async def patch_vocabulary_item(
    vocab_id: str,
    payload: VocabularyUpdateRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> VocabularyDetailItem:
    timezone = await resolve_user_timezone(session, user_id)
    today = today_in_timezone(timezone)
    item = await update_vocabulary_item(
        session, user_id=user_id, vocab_id=vocab_id, payload=payload, today=today
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Vocabulary item not found.")
    return item


@router.post("/api/vocabulary/{vocab_id}/examples", response_model=VocabularyDetailItem)
async def post_vocabulary_example(
    vocab_id: str,
    payload: VocabularyExampleCreateRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> VocabularyDetailItem:
    timezone = await resolve_user_timezone(session, user_id)
    today = today_in_timezone(timezone)
    item = await add_vocabulary_example(
        session, user_id=user_id, vocab_id=vocab_id, payload=payload, today=today
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Vocabulary item not found.")
    return item


@router.get("/api/reviews/today", response_model=ReviewTodayResponse)
async def reviews_today(
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> ReviewTodayResponse:
    timezone = await resolve_user_timezone(session, user_id)
    today = today_in_timezone(timezone)
    return await get_reviews_today(session, user_id=user_id, today=today, timezone=timezone)


@router.post("/api/reviews/{vocab_id}/submit", response_model=ReviewSubmitResponse)
async def review_submit(
    vocab_id: str,
    payload: ReviewSubmitRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> ReviewSubmitResponse:
    timezone = await resolve_user_timezone(session, user_id)
    today = today_in_timezone(timezone)
    result = await submit_review_result(
        session, user_id=user_id, vocab_id=vocab_id, result=payload.result, today=today
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Review item not found.")
    return result


@router.post("/api/reviews/session/start", response_model=ReviewTodayResponse)
async def review_session_start(
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> ReviewTodayResponse:
    timezone = await resolve_user_timezone(session, user_id)
    today = today_in_timezone(timezone)
    return await get_reviews_today(session, user_id=user_id, today=today, timezone=timezone)


@router.post("/api/reviews/session/complete", response_model=ReviewSessionCompleteResponse)
async def review_session_complete(
    payload: ReviewSessionCompleteRequest,
    user_id: str = Depends(get_current_user_id),
) -> ReviewSessionCompleteResponse:
    return summarize_results(payload.results)


@router.get("/api/notification-settings", response_model=NotificationSettingsResponse)
async def notification_settings_get(
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> NotificationSettingsResponse:
    record = await get_settings_record(session, user_id)
    return NotificationSettingsResponse(
        timezone=record.timezone,
        daily_reminder_time=record.daily_reminder_time,
        app_push_enabled=record.app_push_enabled,
        telegram_enabled=record.telegram_enabled,
        telegram_chat_id=record.telegram_chat_id,
        mobile_push_token=record.mobile_push_token,
        privacy_no_source_sentence=record.privacy_no_source_sentence,
        privacy_anonymize_before_save=record.privacy_anonymize_before_save,
    )


@router.put("/api/notification-settings", response_model=NotificationSettingsResponse)
async def notification_settings_put(
    payload: NotificationSettingsUpdateRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> NotificationSettingsResponse:
    record = await get_settings_record(session, user_id)
    record.timezone = payload.timezone
    record.daily_reminder_time = payload.daily_reminder_time
    record.app_push_enabled = payload.app_push_enabled
    record.telegram_enabled = payload.telegram_enabled
    record.telegram_chat_id = payload.telegram_chat_id
    record.mobile_push_token = payload.mobile_push_token
    record.privacy_no_source_sentence = payload.privacy_no_source_sentence
    record.privacy_anonymize_before_save = payload.privacy_anonymize_before_save
    await session.commit()
    return await notification_settings_get(session=session, user_id=user_id)


@router.post("/api/notifications/test-telegram")
async def notifications_test_telegram(
    payload: TelegramTestRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, str]:
    try:
        return await send_test_telegram(session, user_id=user_id, chat_id=payload.chat_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/api/notifications/register-push-token")
async def notifications_register_push_token(
    payload: PushTokenRegisterRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, str]:
    await register_push_token(session, user_id=user_id, push_token=payload.push_token)
    return {"status": "ok"}
