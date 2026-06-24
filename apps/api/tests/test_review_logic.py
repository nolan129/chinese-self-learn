from __future__ import annotations

from datetime import date

from app.services.review_logic import apply_review_result


def test_forgot_moves_to_tomorrow_and_can_increase_difficulty() -> None:
    transition = apply_review_result(
        current_stage=2,
        current_status="reviewing",
        current_difficulty="medium",
        successful_review_count=2,
        today=date(2026, 6, 19),
        result="forgot",
    )
    assert transition.next_stage == 1
    assert transition.next_review_at == date(2026, 6, 20)
    assert transition.difficulty == "hard"


def test_easy_can_master_item_at_stage_five() -> None:
    transition = apply_review_result(
        current_stage=4,
        current_status="reviewing",
        current_difficulty="medium",
        successful_review_count=3,
        today=date(2026, 6, 19),
        result="easy",
    )
    assert transition.next_stage == 5
    assert transition.status == "mastered"
