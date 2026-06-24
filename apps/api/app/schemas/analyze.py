from __future__ import annotations

from pydantic import BaseModel, Field


class TokenStatus(str):
    pass


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class TokenResponse(BaseModel):
    token_index: int
    text: str
    pinyin: str | None
    meaning_vi_brief: str | None
    token_type: str
    is_learnable: bool
    status: str
    confidence: float | None = None


class SentenceAnalysisResponse(BaseModel):
    sentence_index: int
    text: str
    translation_vi: str
    natural_explanation_vi: str
    tokens: list[TokenResponse]


class AnalyzeResponse(BaseModel):
    analysis_id: str
    original_text: str
    sentences: list[SentenceAnalysisResponse]


class ExplainTokenRequestItem(BaseModel):
    token_index: int
    text: str
    pinyin: str | None
    meaning_vi_brief: str | None = None
    user_status: str


class ExplainSentenceRequest(BaseModel):
    sentence_index: int
    text: str
    translation_vi: str
    natural_explanation_vi: str | None = None
    tokens: list[ExplainTokenRequestItem]


class ExplainTokensRequest(BaseModel):
    original_text: str
    sentences: list[ExplainSentenceRequest]


class ExplanationExample(BaseModel):
    zh: str
    pinyin: str | None
    vi: str


class ExplanationResponseItem(BaseModel):
    word: str
    pinyin: str
    meaning_vi: str
    meaning_in_context_vi: str
    part_of_speech: str
    usage_note_vi: str
    examples: list[ExplanationExample]
    difficulty_suggestion: str


class ExplainTokensResponse(BaseModel):
    explanations: list[ExplanationResponseItem]
