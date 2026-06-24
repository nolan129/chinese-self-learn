from __future__ import annotations

from datetime import date

from app.services.text import anonymize_text, next_review_label, normalize_word


def test_normalize_word_collapses_whitespace_and_case() -> None:
    assert normalize_word("  看见   Ta  ") == "看见 ta"


def test_anonymize_text_masks_names_email_and_long_numbers() -> None:
    value = "Li Lei gửi mail tới test@example.com với mã 12345678."
    assert anonymize_text(value) == "[ẩn danh] gửi mail tới [ẩn danh] với mã [ẩn danh]."


def test_next_review_label_uses_today_tomorrow_and_mastered_states() -> None:
    today = date(2026, 6, 19)
    assert next_review_label(today, today, "learning") == "Hôm nay"
    assert next_review_label(date(2026, 6, 20), today, "reviewing") == "Ngày mai"
    assert next_review_label(None, today, "mastered") == "Đã thuộc"
