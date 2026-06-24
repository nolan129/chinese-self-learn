from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import NotificationSettings, VocabularyExample, VocabularyItem
from app.schemas.vocabulary import (
    VocabularyCreateItem,
    VocabularyDetailItem,
    VocabularyExampleCreateRequest,
    VocabularyListItem,
    VocabularyUpdateRequest,
)
from app.services.text import anonymize_text, next_review_label, normalize_word


async def get_notification_settings(session: AsyncSession, user_id: str) -> NotificationSettings:
    settings = await session.scalar(
        select(NotificationSettings).where(NotificationSettings.user_id == user_id)
    )
    if settings is None:
        raise RuntimeError("Notification settings not found for user.")
    return settings


async def create_or_merge_vocabulary_items(
    session: AsyncSession,
    *,
    user_id: str,
    items: list[VocabularyCreateItem],
    today,
) -> list[VocabularyListItem]:
    settings = await get_notification_settings(session, user_id)
    results: list[VocabularyItem] = []

    for item in items:
        normalized_word = normalize_word(item.word)
        existing = await session.scalar(
            select(VocabularyItem).where(
                VocabularyItem.user_id == user_id,
                VocabularyItem.normalized_word == normalized_word,
                VocabularyItem.pinyin == item.pinyin,
            )
        )

        if existing is None:
            existing = VocabularyItem(
                user_id=user_id,
                word=item.word,
                normalized_word=normalized_word,
                pinyin=item.pinyin,
                meaning_vi=item.meaning_vi,
                meaning_in_context_vi=item.meaning_in_context_vi,
                part_of_speech=item.part_of_speech,
                usage_note_vi=item.usage_note_vi,
                difficulty=item.difficulty,
                status="learning",
                review_stage=0,
                review_count=0,
                successful_review_count=0,
                memory_strength=0,
                next_review_at=today,
            )
            session.add(existing)
            await session.flush()
        else:
            existing.meaning_vi = item.meaning_vi
            existing.meaning_in_context_vi = item.meaning_in_context_vi
            existing.part_of_speech = item.part_of_speech
            existing.usage_note_vi = item.usage_note_vi
            existing.difficulty = item.difficulty
            existing.updated_at = datetime.now(tz=UTC)

        for example in item.examples:
            await _append_example(
                session,
                vocab_id=existing.id,
                source_sentence_zh=item.source_sentence_zh,
                source_sentence_vi=item.source_sentence_vi,
                example_zh=example.zh,
                example_pinyin=example.pinyin,
                example_vi=example.vi,
                settings=settings,
            )
        results.append(existing)

    await session.commit()
    refreshed = await list_vocabulary(session, user_id=user_id, today=today)
    refreshed_map = {item.id: item for item in refreshed}
    return [refreshed_map[item.id] for item in results]


async def _append_example(
    session: AsyncSession,
    *,
    vocab_id: str,
    source_sentence_zh: str | None,
    source_sentence_vi: str | None,
    example_zh: str,
    example_pinyin: str | None,
    example_vi: str,
    settings: NotificationSettings,
) -> None:
    final_source_zh = None if settings.privacy_no_source_sentence else source_sentence_zh
    final_source_vi = None if settings.privacy_no_source_sentence else source_sentence_vi
    final_example_zh = example_zh
    final_example_vi = example_vi

    if settings.privacy_anonymize_before_save:
        final_source_zh = anonymize_text(final_source_zh)
        final_source_vi = anonymize_text(final_source_vi)
        final_example_zh = anonymize_text(final_example_zh) or final_example_zh
        final_example_vi = anonymize_text(final_example_vi) or final_example_vi

    duplicate = await session.scalar(
        select(VocabularyExample).where(
            VocabularyExample.vocab_id == vocab_id,
            VocabularyExample.example_zh == final_example_zh,
            VocabularyExample.example_vi == final_example_vi,
        )
    )
    if duplicate is not None:
        return

    session.add(
        VocabularyExample(
            vocab_id=vocab_id,
            source_sentence_zh=final_source_zh,
            source_sentence_vi=final_source_vi,
            example_zh=final_example_zh,
            example_pinyin=example_pinyin,
            example_vi=final_example_vi,
            is_user_source=source_sentence_zh is not None,
        )
    )


async def list_vocabulary(
    session: AsyncSession,
    *,
    user_id: str,
    today,
    query: str | None = None,
    status: str | None = None,
) -> list[VocabularyListItem]:
    statement = (
        select(VocabularyItem)
        .where(VocabularyItem.user_id == user_id)
        .options(selectinload(VocabularyItem.examples))
        .order_by(VocabularyItem.updated_at.desc())
    )
    if query:
        like = f"%{query.lower()}%"
        statement = statement.where(
            or_(
                VocabularyItem.word.ilike(like),
                VocabularyItem.pinyin.ilike(like),
                VocabularyItem.meaning_vi.ilike(like),
            )
        )
    if status == "due":
        statement = statement.where(VocabularyItem.next_review_at <= today)
    elif status:
        statement = statement.where(VocabularyItem.status == status)

    items = (await session.scalars(statement)).all()
    return [_to_list_item(item, today) for item in items]


async def get_vocabulary_detail(
    session: AsyncSession, *, user_id: str, vocab_id: str, today
) -> VocabularyDetailItem | None:
    item = await session.scalar(
        select(VocabularyItem)
        .where(VocabularyItem.user_id == user_id, VocabularyItem.id == vocab_id)
        .options(selectinload(VocabularyItem.examples))
    )
    if item is None:
        return None

    base = _to_list_item(item, today)
    return VocabularyDetailItem(
        **base.model_dump(),
        successful_review_count=item.successful_review_count,
        memory_strength=item.memory_strength,
        examples=[
            VocabularyExampleCreateRequest(
                source_sentence_zh=example.source_sentence_zh,
                source_sentence_vi=example.source_sentence_vi,
                example_zh=example.example_zh,
                example_pinyin=example.example_pinyin,
                example_vi=example.example_vi,
                is_user_source=example.is_user_source,
            )
            for example in item.examples
        ],
    )


async def update_vocabulary_item(
    session: AsyncSession,
    *,
    user_id: str,
    vocab_id: str,
    payload: VocabularyUpdateRequest,
    today,
) -> VocabularyDetailItem | None:
    item = await session.scalar(
        select(VocabularyItem)
        .where(VocabularyItem.user_id == user_id, VocabularyItem.id == vocab_id)
        .options(selectinload(VocabularyItem.examples))
    )
    if item is None:
        return None

    if payload.status is not None:
        item.status = payload.status
    if payload.difficulty is not None:
        item.difficulty = payload.difficulty
    if payload.next_review_at is not None:
        item.next_review_at = payload.next_review_at
    item.updated_at = datetime.now(tz=UTC)

    await session.commit()
    await session.refresh(item)
    return await get_vocabulary_detail(session, user_id=user_id, vocab_id=vocab_id, today=today)


async def add_vocabulary_example(
    session: AsyncSession,
    *,
    user_id: str,
    vocab_id: str,
    payload: VocabularyExampleCreateRequest,
    today,
) -> VocabularyDetailItem | None:
    item = await session.scalar(
        select(VocabularyItem).where(VocabularyItem.user_id == user_id, VocabularyItem.id == vocab_id)
    )
    if item is None:
        return None

    settings = await get_notification_settings(session, user_id)
    await _append_example(
        session,
        vocab_id=vocab_id,
        source_sentence_zh=payload.source_sentence_zh,
        source_sentence_vi=payload.source_sentence_vi,
        example_zh=payload.example_zh,
        example_pinyin=payload.example_pinyin,
        example_vi=payload.example_vi,
        settings=settings,
    )
    await session.commit()
    return await get_vocabulary_detail(session, user_id=user_id, vocab_id=vocab_id, today=today)


def _to_list_item(item: VocabularyItem, today) -> VocabularyListItem:
    first_example = item.examples[0] if item.examples else None
    return VocabularyListItem(
        id=item.id,
        word=item.word,
        pinyin=item.pinyin,
        meaning_vi=item.meaning_vi,
        meaning_in_context_vi=item.meaning_in_context_vi,
        part_of_speech=item.part_of_speech,
        usage_note_vi=item.usage_note_vi,
        status=item.status,
        difficulty=item.difficulty,
        review_stage=item.review_stage,
        review_count=item.review_count,
        next_review_at=item.next_review_at,
        next_review_label=next_review_label(item.next_review_at, today, item.status),
        example_zh=first_example.example_zh if first_example else None,
        example_vi=first_example.example_vi if first_example else None,
    )
