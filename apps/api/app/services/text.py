from __future__ import annotations

import re
import unicodedata
from datetime import date


def normalize_word(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).strip().lower()
    return re.sub(r"\s+", " ", normalized)


def anonymize_text(value: str | None) -> str | None:
    if value is None:
        return None
    masked = re.sub(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b", "[ẩn danh]", value)
    masked = re.sub(r"[\w\.-]+@[\w\.-]+", "[ẩn danh]", masked)
    masked = re.sub(r"\b\d{6,}\b", "[ẩn danh]", masked)
    return masked


def next_review_label(next_review_at: date | None, today: date, status: str) -> str:
    if status == "mastered":
        return "Đã thuộc"
    if next_review_at is None:
        return "Chưa lên lịch"
    delta = (next_review_at - today).days
    if delta <= 0:
        return "Hôm nay"
    if delta == 1:
        return "Ngày mai"
    return f"{delta} ngày nữa"
