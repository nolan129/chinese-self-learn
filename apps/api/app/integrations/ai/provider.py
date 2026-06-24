from __future__ import annotations

import json
import re
import uuid
from urllib.parse import urlparse
from dataclasses import dataclass, field
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.settings import Settings, get_settings
from app.schemas.analyze import (
    AnalyzeResponse,
    ExplainTokensRequest,
    ExplainTokensResponse,
    ExplanationExample,
    ExplanationResponseItem,
    SentenceAnalysisResponse,
    TokenResponse,
)

WORD_DICTIONARY = {
    "你": ("ni", "bạn", "pronoun", "easy"),
    "看见": ("kan jian", "nhìn thấy", "verb", "medium"),
    "他": ("ta", "anh ấy", "pronoun", "easy"),
    "吗": ("ma", "trợ từ nghi vấn", "particle", "easy"),
    "处理": ("chu li", "xử lý", "verb", "hard"),
    "安排": ("an pai", "sắp xếp", "verb", "medium"),
}

EXPLANATION_DICTIONARY = {
    "看见": ExplanationResponseItem(
        word="看见",
        pinyin="kan jian",
        meaning_vi="nhìn thấy, thấy được",
        meaning_in_context_vi="Trong câu này, 看见他 nghĩa là nhìn thấy anh ấy hoặc có thấy anh ấy hay không.",
        part_of_speech="verb",
        usage_note_vi="看见 nhấn mạnh kết quả là đã nhìn thấy, khác với 看 chỉ là hành động nhìn.",
        examples=[
            ExplanationExample(
                zh="你看见我的手机吗？",
                pinyin="ni kan jian wo de shou ji ma",
                vi="Bạn có thấy điện thoại của tôi không?",
            )
        ],
        difficulty_suggestion="medium",
    ),
    "吗": ExplanationResponseItem(
        word="吗",
        pinyin="ma",
        meaning_vi="trợ từ nghi vấn đặt cuối câu",
        meaning_in_context_vi="Trong câu này, 吗 biến câu trần thuật thành một câu hỏi có hoặc không.",
        part_of_speech="particle",
        usage_note_vi="吗 thường đứng cuối câu hỏi yes/no. Khi nói nhanh, âm này nhẹ và ngắn.",
        examples=[
            ExplanationExample(zh="你忙吗？", pinyin="ni mang ma", vi="Bạn có bận không?")
        ],
        difficulty_suggestion="easy",
    ),
    "处理": ExplanationResponseItem(
        word="处理",
        pinyin="chu li",
        meaning_vi="xử lý, giải quyết",
        meaning_in_context_vi="Từ này thường dùng khi nói về xử lý công việc, tài liệu, yêu cầu hoặc vấn đề.",
        part_of_speech="verb",
        usage_note_vi="Đây là động từ rất phổ biến trong chat công việc.",
        examples=[
            ExplanationExample(
                zh="这个问题我来处理。",
                pinyin="zhe ge wen ti wo lai chu li",
                vi="Vấn đề này để tôi xử lý.",
            )
        ],
        difficulty_suggestion="hard",
    ),
    "安排": ExplanationResponseItem(
        word="安排",
        pinyin="an pai",
        meaning_vi="sắp xếp, bố trí",
        meaning_in_context_vi="Từ này dùng khi nói về sắp xếp lịch, nhân sự, công việc hoặc kế hoạch.",
        part_of_speech="verb",
        usage_note_vi="Rất thường gặp trong bối cảnh công việc.",
        examples=[
            ExplanationExample(
                zh="我安排一下时间。",
                pinyin="wo an pai yi xia shi jian",
                vi="Tôi sắp xếp thời gian một chút.",
            )
        ],
        difficulty_suggestion="medium",
    ),
}

PUNCTUATION_PATTERN = re.compile(r"[？?！!。,.，：:；;、]")

ANALYZE_SYSTEM_PROMPT = """
Bạn là trợ lý học tiếng Trung cho người Việt. Nhiệm vụ của bạn là phân tích câu hoặc đoạn tiếng Trung để hỗ trợ học từ vựng theo ngữ cảnh công việc.

Luôn trả kết quả bằng JSON hợp lệ. Không trả markdown. Không thêm giải thích ngoài JSON.
Tất cả nội dung giải thích và dịch nghĩa phải bằng tiếng Việt.
Không gợi ý cách trả lời đồng nghiệp.
""".strip()

EXPLAIN_SYSTEM_PROMPT = """
Bạn là trợ lý học tiếng Trung cho người Việt. Hãy giải thích từ/cụm từ tiếng Trung theo ngữ cảnh câu gốc.

Luôn trả kết quả bằng JSON hợp lệ. Không trả markdown. Không thêm giải thích ngoài JSON.
Tất cả giải thích phải bằng tiếng Việt. Không dùng tiếng Anh trừ khi tiếng Anh là một phần bắt buộc của thuật ngữ gốc.
Không gợi ý cách trả lời lại đồng nghiệp.
""".strip()


class _ProviderResponseError(ValueError):
    pass


class _RemoteAnalyzeToken(BaseModel):
    model_config = ConfigDict(extra="ignore")

    token_index: int | None = None
    text: str
    pinyin: str | None = None
    meaning_vi_brief: str | None = None
    token_type: str = "word"
    is_learnable: bool = True
    confidence: float | None = Field(default=None, ge=0, le=1)


class _RemoteAnalyzeSentence(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sentence_index: int | None = None
    text: str | None = None
    sentence: str | None = None
    sentence_text: str | None = None
    original_sentence: str | None = None
    translation_vi: str | None = None
    translation: str | None = None
    translation_vietnamese: str | None = None
    natural_explanation_vi: str | None = None
    natural_explanation: str | None = None
    explanation_vi: str | None = None
    natural_vi: str | None = None
    tokens: list[_RemoteAnalyzeToken]


class _RemoteAnalyzePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    original_text: str | None = None
    original: str | None = None
    sentences: list[_RemoteAnalyzeSentence]


class _RemoteExplanationExample(BaseModel):
    model_config = ConfigDict(extra="ignore")

    zh: str | None = None
    hanzi: str | None = None
    chinese: str | None = None
    cau_trung: str | None = None
    sentence: str | None = None
    pinyin: str | None = None
    vi: str | None = None
    nghia_vi: str | None = None
    meaning_vi: str | None = None
    vietnamese: str | None = None
    translation_vi: str | None = None


class _RemoteExplanationItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    word: str | None = None
    token: str | None = None
    pinyin: str | None = None
    meaning_vi: str | None = None
    nghia_tieng_viet: str | None = None
    meaning: str | None = None
    meaning_brief: str | None = None
    meaning_in_context_vi: str | None = None
    nghia_trong_ngu_canh: str | None = None
    meaning_in_context: str | None = None
    part_of_speech: str | None = None
    loai_tu: str | None = None
    tu_loai: str | None = None
    pos: str | None = None
    usage_note_vi: str | list[str] | None = None
    ghi_chu_su_dung: str | list[str] | None = None
    usage_note: str | None = None
    note: str | None = None
    examples: list[_RemoteExplanationExample] | None = None
    vi_du: list[_RemoteExplanationExample] | None = None
    example_sentences: list[_RemoteExplanationExample] | None = None
    difficulty_suggestion: str | None = None


class _RemoteExplainSentenceResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sentence_index: int | None = None
    sentence: str | None = None
    text: str | None = None
    translation_vi: str | None = None
    token_explanations: list[_RemoteExplanationItem] | None = None


class _RemoteExplainPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    explanations: list[_RemoteExplanationItem] | None = None
    results: list[_RemoteExplainSentenceResult] | None = None


@dataclass(slots=True)
class AiProvider:
    settings: Settings = field(default_factory=get_settings)
    http_transport: httpx.AsyncBaseTransport | None = field(default=None, repr=False)

    async def analyze_text(self, text: str) -> AnalyzeResponse:
        if self._should_use_remote_provider():
            try:
                return await self._analyze_text_remote(text)
            except (httpx.HTTPError, _ProviderResponseError):
                return self._analyze_text_local(text)
        return self._analyze_text_local(text)

    async def explain_tokens(self, payload: ExplainTokensRequest) -> ExplainTokensResponse:
        if self._should_use_remote_provider():
            try:
                return await self._explain_tokens_remote(payload)
            except (httpx.HTTPError, _ProviderResponseError):
                return self._explain_tokens_local(payload)
        return self._explain_tokens_local(payload)

    def runtime_mode(self) -> str:
        return "remote_ai" if self._should_use_remote_provider() else "local_fallback"

    def _should_use_remote_provider(self) -> bool:
        return (
            self.settings.ai_provider == "openai_compatible"
            and bool(self.settings.ai_api_url)
            and bool(self.settings.ai_model)
        )

    async def _analyze_text_remote(self, text: str) -> AnalyzeResponse:
        sentence_chunks = _split_text_for_remote_analyze(text)
        merged_sentences: list[SentenceAnalysisResponse] = []
        for chunk in sentence_chunks:
            sentence = await self._analyze_sentence_remote(chunk)
            merged_sentences.append(
                SentenceAnalysisResponse(
                    sentence_index=len(merged_sentences),
                    text=sentence.text,
                    translation_vi=sentence.translation_vi,
                    natural_explanation_vi=sentence.natural_explanation_vi,
                    tokens=sentence.tokens,
                )
            )

        return AnalyzeResponse(
            analysis_id=f"analysis_{uuid.uuid4().hex[:8]}",
            original_text=text,
            sentences=merged_sentences,
        )

    async def _explain_tokens_remote(self, payload: ExplainTokensRequest) -> ExplainTokensResponse:
        selected_sentences = [
            sentence
            for sentence in payload.sentences
            if any(token.user_status in {"unknown", "review"} for token in sentence.tokens)
        ]
        merged: list[ExplanationResponseItem] = []
        seen_keys: set[tuple[str, str]] = set()

        for sentence in selected_sentences:
            sentence_request = ExplainTokensRequest(
                original_text=payload.original_text,
                sentences=[sentence],
            )
            response = await self._explain_sentence_remote(sentence_request)
            for item in response.explanations:
                key = (item.word, item.pinyin.strip())
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                merged.append(item)

        return ExplainTokensResponse(explanations=merged)

    async def _run_remote_completion(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        validator,
        timeout_seconds: float | None = None,
    ):
        last_error: Exception | None = None
        attempts = max(1, self.settings.ai_max_retries + 1)

        for _ in range(attempts):
            try:
                payload = await self._request_json_payload(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    timeout_seconds=timeout_seconds,
                )
                return validator(payload)
            except (ValidationError, _ProviderResponseError, json.JSONDecodeError) as exc:
                last_error = exc

        raise _ProviderResponseError("AI provider returned invalid structured output.") from last_error

    async def _request_json_payload(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        timeout_seconds: float | None = None,
    ) -> dict[str, Any]:
        request_payload = {
            "model": self.settings.ai_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0,
            "response_format": {"type": "json_object"},
        }
        headers = {"content-type": "application/json"}
        if self.settings.ai_api_key:
            headers["authorization"] = f"Bearer {self.settings.ai_api_key}"

        async with httpx.AsyncClient(
            timeout=timeout_seconds or self.settings.ai_timeout_seconds,
            transport=self.http_transport,
        ) as client:
            response = await client.post(
                _resolve_request_url(self.settings.ai_api_url),
                headers=headers,
                json=request_payload,
            )
            response.raise_for_status()
            response_payload = response.json()

        content = _extract_text_content(response_payload)
        structured = _coerce_json_object(content)
        if not isinstance(structured, dict):
            raise _ProviderResponseError("AI provider payload must be a JSON object.")
        return structured

    def _analyze_text_local(self, text: str) -> AnalyzeResponse:
        tokens = _tokenize_text(text)
        sentence = SentenceAnalysisResponse(
            sentence_index=0,
            text=text,
            translation_vi="Bạn có thấy anh ấy không?"
            if text == "你看见他吗？"
            else "Bản dịch tự động đang dùng chế độ nội bộ.",
            natural_explanation_vi="Người nói đang hỏi bạn có nhìn thấy hoặc gặp người đó không."
            if text == "你看见他吗？"
            else "Giải thích tự động đang dùng chế độ nội bộ để phục vụ luồng học từ.",
            tokens=tokens,
        )
        return AnalyzeResponse(
            analysis_id=f"analysis_{uuid.uuid4().hex[:8]}",
            original_text=text,
            sentences=[sentence],
        )

    def _explain_tokens_local(self, payload: ExplainTokensRequest) -> ExplainTokensResponse:
        explanations: list[ExplanationResponseItem] = []
        for sentence in payload.sentences:
            for token in sentence.tokens:
                if token.user_status not in {"unknown", "review"}:
                    continue
                explanations.append(_local_explanation_for_token(sentence_text=sentence.text, sentence_vi=sentence.translation_vi, token_text=token.text, token_pinyin=token.pinyin, token_meaning=token.meaning_vi_brief))
        return ExplainTokensResponse(explanations=explanations)

    async def _analyze_sentence_remote(self, text: str) -> SentenceAnalysisResponse:
        user_prompt = (
            "Hãy phân tích câu hoặc mệnh đề tiếng Trung sau.\n\n"
            "Yêu cầu:\n"
            "1. Tách thành các từ hoặc cụm từ có nghĩa trong tiếng Trung hiện đại.\n"
            "2. Không tách từng chữ nếu các chữ tạo thành một từ ghép hoặc cụm cố định có nghĩa.\n"
            "3. Giữ dấu câu dưới dạng token loại punctuation, is_learnable = false, status = ignored.\n"
            "4. Với token có thể học, cung cấp pinyin, nghĩa tiếng Việt ngắn, loại token, confidence và status = unselected.\n"
            "5. Dịch nghĩa toàn câu sang tiếng Việt.\n"
            "6. Giải thích ý tự nhiên của câu bằng tiếng Việt.\n"
            "7. Trả đúng một phần tử trong trường sentences.\n\n"
            f"Nội dung:\n{text}"
        )
        response = await self._run_remote_completion(
            system_prompt=ANALYZE_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            validator=lambda data: _normalize_analyze_payload(data, original_text=text),
            timeout_seconds=_resolve_analyze_timeout_seconds(
                base_timeout=self.settings.ai_timeout_seconds,
                text=text,
            ),
        )
        if not response.sentences:
            raise _ProviderResponseError("AI provider did not return any analyzed sentence.")
        return response.sentences[0]

    async def _explain_sentence_remote(self, payload: ExplainTokensRequest) -> ExplainTokensResponse:
        sentence = payload.sentences[0]
        user_prompt = (
            "Hãy giải thích các token được chọn trong câu tiếng Trung sau.\n\n"
            "Yêu cầu:\n"
            "1. Chỉ giải thích target_tokens.\n"
            "2. Giải thích nghĩa theo đúng ngữ cảnh câu gốc.\n"
            "3. Nếu token có nhiều nghĩa, ưu tiên nghĩa đang dùng trong câu.\n"
            "4. Cung cấp pinyin, nghĩa tiếng Việt, nghĩa trong ngữ cảnh, loại từ, ghi chú sử dụng và ví dụ.\n"
            "5. Ví dụ nên gần với giao tiếp công việc hoặc đời sống phổ biến.\n"
            "6. Không gợi ý cách phản hồi.\n"
            "7. Chỉ trả về giải nghĩa cho những token có trong payload hiện tại.\n\n"
            f"Payload:\n{payload.model_dump_json(ensure_ascii=False, indent=2)}"
        )
        return await self._run_remote_completion(
            system_prompt=EXPLAIN_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            validator=lambda data: _normalize_explain_payload(data, request=payload),
            timeout_seconds=_resolve_explain_timeout_seconds(
                base_timeout=self.settings.ai_timeout_seconds,
                sentence_text=sentence.text,
                selected_token_count=sum(
                    1 for token in sentence.tokens if token.user_status in {"unknown", "review"}
                ),
            ),
        )


def _normalize_analyze_payload(data: dict[str, Any], *, original_text: str) -> AnalyzeResponse:
    parsed = _RemoteAnalyzePayload.model_validate(data)
    sentences: list[SentenceAnalysisResponse] = []

    for sentence_index, sentence in enumerate(parsed.sentences):
        resolved_text = (
            sentence.text
            or sentence.sentence
            or sentence.sentence_text
            or sentence.original_sentence
            or (parsed.original_text if len(parsed.sentences) == 1 else None)
            or (parsed.original if len(parsed.sentences) == 1 else None)
            or original_text
        )
        resolved_translation = (
            sentence.translation_vi
            or sentence.translation
            or sentence.translation_vietnamese
            or "Bản dịch tự động từ provider chưa cung cấp đầy đủ."
        )
        resolved_explanation = (
            sentence.natural_explanation_vi
            or sentence.natural_explanation
            or sentence.explanation_vi
            or sentence.natural_vi
            or "Giải thích tự nhiên chưa được provider trả về đầy đủ."
        )
        tokens: list[TokenResponse] = []
        for token_index, token in enumerate(sentence.tokens):
            is_punctuation = _is_punctuation(token.text)
            fallback_pinyin, fallback_meaning, fallback_type, _ = WORD_DICTIONARY.get(
                token.text,
                ("", None, "word", "medium"),
            )
            tokens.append(
                TokenResponse(
                    token_index=token.token_index if token.token_index is not None else token_index,
                    text=token.text,
                    pinyin=None if is_punctuation else (token.pinyin or fallback_pinyin or None),
                    meaning_vi_brief=None if is_punctuation else (token.meaning_vi_brief or fallback_meaning),
                    token_type="punctuation" if is_punctuation else (token.token_type or fallback_type),
                    is_learnable=False if is_punctuation else token.is_learnable,
                    status="ignored" if is_punctuation or not token.is_learnable else "unselected",
                    confidence=token.confidence,
                )
            )
        sentences.append(
            SentenceAnalysisResponse(
                sentence_index=sentence.sentence_index if sentence.sentence_index is not None else sentence_index,
                text=resolved_text,
                translation_vi=resolved_translation,
                natural_explanation_vi=resolved_explanation,
                tokens=tokens,
            )
        )

    return AnalyzeResponse(
        analysis_id=f"analysis_{uuid.uuid4().hex[:8]}",
        original_text=original_text,
        sentences=sentences,
    )


def _normalize_explain_payload(data: dict[str, Any], *, request: ExplainTokensRequest) -> ExplainTokensResponse:
    parsed = _RemoteExplainPayload.model_validate(data)
    requested_keys = _requested_explanation_keys(request)
    requested_words = _requested_explanation_words(request)
    explanation_by_key: dict[tuple[str, str], ExplanationResponseItem] = {}
    explanation_by_word: dict[str, ExplanationResponseItem] = {}

    raw_items: list[_RemoteExplanationItem] = []
    raw_explanations = data.get("explanations")
    if isinstance(raw_explanations, list):
        for item in raw_explanations:
            if isinstance(item, dict):
                raw_items.append(_RemoteExplanationItem.model_validate(item))
    elif parsed.explanations:
        raw_items.extend(parsed.explanations)

    raw_results = data.get("results")
    if isinstance(raw_results, list):
        for result in raw_results:
            if not isinstance(result, dict):
                continue
            token_explanations = result.get("token_explanations")
            if isinstance(token_explanations, list):
                for item in token_explanations:
                    if isinstance(item, dict):
                        raw_items.append(_RemoteExplanationItem.model_validate(item))
                continue
            raw_items.append(_RemoteExplanationItem.model_validate(result))
    elif parsed.results:
        for result in parsed.results:
            if result.token_explanations:
                raw_items.extend(result.token_explanations)

    for explanation in raw_items:
        resolved_word = explanation.word or explanation.token
        if not resolved_word:
            continue
        normalized_pinyin = (explanation.pinyin or "").strip()
        key = (resolved_word, normalized_pinyin)
        if key not in requested_keys:
            if resolved_word not in requested_words:
                continue
        examples = explanation.examples or explanation.vi_du or explanation.example_sentences or []
        resolved_meaning = (
            explanation.meaning_vi
            or explanation.nghia_tieng_viet
            or explanation.meaning
            or explanation.meaning_brief
            or explanation.meaning_in_context_vi
            or explanation.nghia_trong_ngu_canh
            or explanation.meaning_in_context
            or "Chưa có nghĩa ngắn từ provider."
        )
        resolved_context_meaning = (
            explanation.meaning_in_context_vi
            or explanation.nghia_trong_ngu_canh
            or explanation.meaning_in_context
            or resolved_meaning
        )
        resolved_part_of_speech = (
            explanation.part_of_speech
            or explanation.loai_tu
            or explanation.tu_loai
            or explanation.pos
            or "unknown"
        )
        resolved_usage_note = _coerce_text_value(
            explanation.usage_note_vi,
            explanation.ghi_chu_su_dung,
            explanation.usage_note,
            explanation.note,
            default="Provider chưa trả về ghi chú sử dụng chi tiết.",
        )
        explanation_by_key[key] = ExplanationResponseItem(
            word=resolved_word,
            pinyin=normalized_pinyin,
            meaning_vi=resolved_meaning,
            meaning_in_context_vi=resolved_context_meaning,
            part_of_speech=resolved_part_of_speech,
            usage_note_vi=resolved_usage_note,
            examples=[
                ExplanationExample(
                    zh=example.zh
                    or example.hanzi
                    or example.chinese
                    or example.cau_trung
                    or example.sentence
                    or "",
                    pinyin=example.pinyin,
                    vi=example.vi
                    or example.nghia_vi
                    or example.meaning_vi
                    or example.vietnamese
                    or example.translation_vi
                    or "",
                )
                for example in examples
                if (
                    example.zh
                    or example.hanzi
                    or example.chinese
                    or example.cau_trung
                    or example.sentence
                )
                and (
                    example.vi
                    or example.nghia_vi
                    or example.meaning_vi
                    or example.vietnamese
                    or example.translation_vi
                )
            ],
            difficulty_suggestion=explanation.difficulty_suggestion or "medium",
        )
        explanation_by_word.setdefault(resolved_word, explanation_by_key[key])

    missing = [
        key for key in requested_keys if key not in explanation_by_key and key[0] not in explanation_by_word
    ]
    if missing:
        raise _ProviderResponseError("AI provider response is missing one or more selected tokens.")

    return ExplainTokensResponse(
        explanations=[
            explanation_by_key[key] if key in explanation_by_key else explanation_by_word[key[0]]
            for key in requested_keys
        ]
    )


def _requested_explanation_keys(request: ExplainTokensRequest) -> list[tuple[str, str]]:
    keys: list[tuple[str, str]] = []
    for sentence in request.sentences:
        for token in sentence.tokens:
            if token.user_status not in {"unknown", "review"}:
                continue
            key = (token.text, (token.pinyin or "").strip())
            if key not in keys:
                keys.append(key)
    return keys


def _requested_explanation_words(request: ExplainTokensRequest) -> list[str]:
    words: list[str] = []
    for sentence in request.sentences:
        for token in sentence.tokens:
            if token.user_status not in {"unknown", "review"}:
                continue
            if token.text not in words:
                words.append(token.text)
    return words


def _coerce_text_value(*values: Any, default: str) -> str:
    for value in values:
        if isinstance(value, str):
            normalized = value.strip()
            if normalized:
                return normalized
        if isinstance(value, list):
            parts = [part.strip() for part in value if isinstance(part, str) and part.strip()]
            if parts:
                return " ".join(parts)
    return default


def _local_explanation_for_token(
    *,
    sentence_text: str,
    sentence_vi: str,
    token_text: str,
    token_pinyin: str | None,
    token_meaning: str | None,
) -> ExplanationResponseItem:
    return EXPLANATION_DICTIONARY.get(
        token_text,
        ExplanationResponseItem(
            word=token_text,
            pinyin=token_pinyin or "",
            meaning_vi=token_meaning or "Chưa có nghĩa ngắn",
            meaning_in_context_vi=(
                f"Token {token_text} được giữ lại để người học xem lại trong ngữ cảnh hiện tại."
            ),
            part_of_speech="unknown",
            usage_note_vi="Chế độ local chưa có từ điển đầy đủ cho token này.",
            examples=[
                ExplanationExample(
                    zh=sentence_text,
                    pinyin=None,
                    vi=sentence_vi,
                )
            ],
            difficulty_suggestion="medium",
        ),
    )


def _extract_text_content(payload: dict[str, Any]) -> str:
    output_text = payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text

    choices = payload.get("choices")
    if isinstance(choices, list) and choices:
        message = choices[0].get("message", {})
        content = message.get("content")
        if isinstance(content, str) and content.strip():
            return content
        if isinstance(content, list):
            text_parts: list[str] = []
            for part in content:
                if isinstance(part, dict) and isinstance(part.get("text"), str):
                    text_parts.append(part["text"])
            joined = "".join(text_parts).strip()
            if joined:
                return joined

    raise _ProviderResponseError("AI provider response does not contain a text payload.")


def _resolve_request_url(value: str | None) -> str:
    if not value:
        raise _ProviderResponseError("AI provider URL is not configured.")

    normalized = value.rstrip("/")
    parsed = urlparse(normalized)
    path = parsed.path.rstrip("/")

    if path.endswith("/chat/completions") or path.endswith("/responses"):
        return normalized
    if path in {"", "/v1"}:
        return f"{normalized}/chat/completions"
    return normalized


def _coerce_json_object(content: str) -> Any:
    stripped = content.strip()
    if not stripped:
        raise _ProviderResponseError("AI provider response is empty.")

    fenced_match = re.search(r"```(?:json)?\s*(\{.*\}|\[.*\])\s*```", stripped, re.DOTALL)
    if fenced_match:
        stripped = fenced_match.group(1).strip()

    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    json_candidate = _find_first_balanced_json(stripped)
    if json_candidate is None:
        raise _ProviderResponseError("AI provider response does not contain valid JSON.")
    return json.loads(json_candidate)


def _find_first_balanced_json(value: str) -> str | None:
    for opener, closer in (("{", "}"), ("[", "]")):
        start = value.find(opener)
        if start == -1:
            continue
        depth = 0
        in_string = False
        escape = False
        for index in range(start, len(value)):
            char = value[index]
            if in_string:
                if escape:
                    escape = False
                elif char == "\\":
                    escape = True
                elif char == '"':
                    in_string = False
                continue
            if char == '"':
                in_string = True
            elif char == opener:
                depth += 1
            elif char == closer:
                depth -= 1
                if depth == 0:
                    return value[start : index + 1]
    return None


def _split_text_for_remote_analyze(text: str) -> list[str]:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not normalized:
        return [text]

    chunks: list[str] = []
    current: list[str] = []
    sentence_breaks = {"。", "！", "？", "!", "?"}

    for char in normalized:
        if char == "\n":
            candidate = "".join(current).strip()
            if candidate:
                chunks.append(candidate)
            current = []
            continue

        current.append(char)
        if char in sentence_breaks:
            candidate = "".join(current).strip()
            if candidate:
                chunks.append(candidate)
            current = []

    trailing = "".join(current).strip()
    if trailing:
        chunks.append(trailing)

    return chunks or [normalized]


def _resolve_analyze_timeout_seconds(*, base_timeout: float, text: str) -> float:
    clause_break_count = sum(text.count(mark) for mark in ("，", ",", "；", ";", "：", ":"))
    if len(text) >= 60 or clause_break_count >= 2:
        return max(base_timeout, 90.0)
    if len(text) >= 30 or clause_break_count >= 1:
        return max(base_timeout, 45.0)
    return base_timeout


def _resolve_explain_timeout_seconds(
    *,
    base_timeout: float,
    sentence_text: str,
    selected_token_count: int,
) -> float:
    clause_break_count = sum(sentence_text.count(mark) for mark in ("，", ",", "；", ";", "：", ":"))
    if len(sentence_text) >= 60 or clause_break_count >= 2 or selected_token_count >= 4:
        return max(base_timeout, 90.0)
    if len(sentence_text) >= 30 or clause_break_count >= 1 or selected_token_count >= 2:
        return max(base_timeout, 45.0)
    return base_timeout


def _tokenize_text(text: str) -> list[TokenResponse]:
    if text == "你看见他吗？":
        ordered = ["你", "看见", "他", "吗", "？"]
    else:
        ordered = _greedy_segment(text)

    results: list[TokenResponse] = []
    for index, token in enumerate(ordered):
        if _is_punctuation(token):
            results.append(
                TokenResponse(
                    token_index=index,
                    text=token,
                    pinyin=None,
                    meaning_vi_brief=None,
                    token_type="punctuation",
                    is_learnable=False,
                    status="ignored",
                    confidence=1.0,
                )
            )
            continue

        pinyin, meaning, token_type, _ = WORD_DICTIONARY.get(token, ("", None, "word", "medium"))
        results.append(
            TokenResponse(
                token_index=index,
                text=token,
                pinyin=pinyin or None,
                meaning_vi_brief=meaning,
                token_type=token_type,
                is_learnable=True,
                status="unselected",
                confidence=0.95 if token in WORD_DICTIONARY else 0.5,
            )
        )
    return results


def _greedy_segment(text: str) -> list[str]:
    punctuation = set("？?！!。,.，：:；;、")
    ordered_words = sorted(WORD_DICTIONARY.keys(), key=len, reverse=True)
    result: list[str] = []
    i = 0
    while i < len(text):
        char = text[i]
        if char.isspace():
            i += 1
            continue
        if char in punctuation:
            result.append(char)
            i += 1
            continue
        matched = None
        for word in ordered_words:
            if text.startswith(word, i):
                matched = word
                break
        if matched is None:
            matched = char
        result.append(matched)
        i += len(matched)
    return result


def _is_punctuation(token: str) -> bool:
    return bool(PUNCTUATION_PATTERN.fullmatch(token))
