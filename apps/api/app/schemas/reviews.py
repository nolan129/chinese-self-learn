from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class ReviewTodayItem(BaseModel):
    id: str
    word: str
    pinyin: str
    meaning_vi: str
    example_zh: str | None
    example_vi: str | None
    difficulty: str
    review_stage: int


class ReviewTodayResponse(BaseModel):
    date: date
    timezone: str
    due_count: int
    hard_count: int
    estimated_minutes: int
    items: list[ReviewTodayItem]


class ReviewSubmitRequest(BaseModel):
    result: str


class ReviewSubmitResponse(BaseModel):
    vocab_id: str
    result: str
    previous_stage: int
    next_stage: int
    next_review_at: date
    next_review_label: str
    status: str


class ReviewSessionCompleteRequest(BaseModel):
    results: list[str]


class ReviewSessionCompleteResponse(BaseModel):
    total: int
    forgot: int
    vague: int
    remembered: int
    easy: int
