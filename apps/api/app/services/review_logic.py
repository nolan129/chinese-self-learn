from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta


STAGE_INTERVALS = {
    0: 1,
    1: 1,
    2: 3,
    3: 7,
    4: 14,
    5: 30,
}


@dataclass(slots=True)
class ReviewTransition:
    result: str
    previous_stage: int
    next_stage: int
    next_review_at: date
    status: str
    difficulty: str
    successful_increment: int


def apply_review_result(
    *,
    current_stage: int,
    current_status: str,
    current_difficulty: str,
    successful_review_count: int,
    today: date,
    result: str,
) -> ReviewTransition:
    stage = max(0, min(current_stage, 5))
    status = current_status
    difficulty = current_difficulty
    successful_increment = 0

    if result == "forgot":
        next_stage = max(0, stage - 1)
        next_review_at = today + timedelta(days=1)
        difficulty = "hard"
    elif result == "vague":
        next_stage = stage if stage > 0 else 1
        next_review_at = today + timedelta(days=STAGE_INTERVALS[next_stage])
    elif result == "remembered":
        next_stage = min(5, stage + 1)
        next_review_at = today + timedelta(days=STAGE_INTERVALS[next_stage])
        successful_increment = 1
    elif result == "easy":
        next_stage = min(5, stage + 2)
        next_review_at = today + timedelta(days=STAGE_INTERVALS[next_stage])
        successful_increment = 1
    else:
        raise ValueError(f"Unsupported review result: {result}")

    if next_stage >= 5 and successful_review_count + successful_increment >= 4:
        status = "mastered"
    elif status == "learning" and next_stage >= 1:
        status = "reviewing"

    return ReviewTransition(
        result=result,
        previous_stage=stage,
        next_stage=next_stage,
        next_review_at=next_review_at,
        status=status,
        difficulty=difficulty,
        successful_increment=successful_increment,
    )
