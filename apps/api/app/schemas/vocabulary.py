from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from app.schemas.analyze import ExplanationExample


class VocabularyCreateItem(BaseModel):
    word: str
    pinyin: str
    meaning_vi: str
    meaning_in_context_vi: str
    part_of_speech: str
    usage_note_vi: str | None = None
    difficulty: str = "medium"
    source_sentence_zh: str | None = None
    source_sentence_vi: str | None = None
    examples: list[ExplanationExample] = Field(default_factory=list)


class VocabularyCreateRequest(BaseModel):
    items: list[VocabularyCreateItem]


class VocabularyExampleCreateRequest(BaseModel):
    source_sentence_zh: str | None = None
    source_sentence_vi: str | None = None
    example_zh: str
    example_pinyin: str | None = None
    example_vi: str
    is_user_source: bool = False


class VocabularyUpdateRequest(BaseModel):
    status: str | None = None
    difficulty: str | None = None
    next_review_at: date | None = None


class VocabularyListItem(BaseModel):
    id: str
    word: str
    pinyin: str
    meaning_vi: str
    meaning_in_context_vi: str
    part_of_speech: str
    usage_note_vi: str | None
    status: str
    difficulty: str
    review_stage: int
    review_count: int
    next_review_at: date | None
    next_review_label: str
    example_zh: str | None
    example_vi: str | None


class VocabularyDetailItem(VocabularyListItem):
    successful_review_count: int
    memory_strength: int
    examples: list[VocabularyExampleCreateRequest]
