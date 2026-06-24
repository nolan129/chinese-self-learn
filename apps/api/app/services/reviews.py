from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import ReviewLog, VocabularyItem
from app.schemas.reviews import (
    ReviewSessionCompleteResponse,
    ReviewSubmitResponse,
    ReviewTodayItem,
    ReviewTodayResponse,
)
from app.services.review_logic import apply_review_result
from app.services.text import next_review_label


async def get_reviews_today(session: AsyncSession, *, user_id: str, today, timezone: str) -> ReviewTodayResponse:
    items = (
        await session.scalars(
            select(VocabularyItem)
            .where(
                VocabularyItem.user_id == user_id,
                VocabularyItem.status.in_(["learning", "reviewing"]),
                VocabularyItem.next_review_at.is_not(None),
                VocabularyItem.next_review_at <= today,
            )
            .options(selectinload(VocabularyItem.examples))
            .order_by(VocabularyItem.next_review_at.asc(), VocabularyItem.updated_at.desc())
        )
    ).all()

    hard_count = sum(1 for item in items if item.difficulty == "hard")
    return ReviewTodayResponse(
        date=today,
        timezone=timezone,
        due_count=len(items),
        hard_count=hard_count,
        estimated_minutes=max(1, len(items) // 2) if items else 0,
        items=[
            ReviewTodayItem(
                id=item.id,
                word=item.word,
                pinyin=item.pinyin,
                meaning_vi=item.meaning_vi,
                example_zh=item.examples[0].example_zh if item.examples else None,
                example_vi=item.examples[0].example_vi if item.examples else None,
                difficulty=item.difficulty,
                review_stage=item.review_stage,
            )
            for item in items
        ],
    )


async def submit_review_result(
    session: AsyncSession,
    *,
    user_id: str,
    vocab_id: str,
    result: str,
    today,
) -> ReviewSubmitResponse | None:
    item = await session.scalar(
        select(VocabularyItem).where(VocabularyItem.user_id == user_id, VocabularyItem.id == vocab_id)
    )
    if item is None:
        return None

    transition = apply_review_result(
        current_stage=item.review_stage,
        current_status=item.status,
        current_difficulty=item.difficulty,
        successful_review_count=item.successful_review_count,
        today=today,
        result=result,
    )

    item.review_stage = transition.next_stage
    item.review_count += 1
    item.successful_review_count += transition.successful_increment
    item.status = transition.status
    item.difficulty = transition.difficulty
    item.memory_strength = min(100, transition.next_stage * 20)
    item.last_reviewed_at = datetime.now(tz=UTC)
    item.next_review_at = transition.next_review_at
    item.updated_at = datetime.now(tz=UTC)

    session.add(
        ReviewLog(
            user_id=user_id,
            vocab_id=vocab_id,
            result=result,
            previous_stage=transition.previous_stage,
            next_stage=transition.next_stage,
            next_review_at=transition.next_review_at,
        )
    )
    await session.commit()

    return ReviewSubmitResponse(
        vocab_id=vocab_id,
        result=result,
        previous_stage=transition.previous_stage,
        next_stage=transition.next_stage,
        next_review_at=transition.next_review_at,
        next_review_label=next_review_label(transition.next_review_at, today, transition.status),
        status=transition.status,
    )


def summarize_results(results: list[str]) -> ReviewSessionCompleteResponse:
    counts = {key: 0 for key in ["forgot", "vague", "remembered", "easy"]}
    for result in results:
        if result in counts:
            counts[result] += 1
    return ReviewSessionCompleteResponse(total=len(results), **counts)
