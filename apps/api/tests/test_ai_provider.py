from __future__ import annotations

import asyncio
import json

import httpx

from app.core.settings import Settings
from app.integrations.ai.provider import (
    AiProvider,
    _normalize_analyze_payload,
    _resolve_analyze_timeout_seconds,
    _resolve_explain_timeout_seconds,
    _resolve_request_url,
    _split_text_for_remote_analyze,
)
from app.schemas.analyze import ExplainSentenceRequest, ExplainTokenRequestItem, ExplainTokensRequest


def test_analyze_known_sentence_segments_meaningful_tokens() -> None:
    response = asyncio.run(AiProvider(settings=Settings(AI_PROVIDER="dev")).analyze_text("你看见他吗？"))
    assert [token.text for token in response.sentences[0].tokens] == ["你", "看见", "他", "吗", "？"]
    assert response.sentences[0].tokens[-1].status == "ignored"


def test_explain_only_selected_tokens() -> None:
    payload = ExplainTokensRequest(
        original_text="你看见他吗？",
        sentences=[
            ExplainSentenceRequest(
                sentence_index=0,
                text="你看见他吗？",
                translation_vi="Bạn có thấy anh ấy không?",
                tokens=[
                    ExplainTokenRequestItem(
                        token_index=1,
                        text="看见",
                        pinyin="kan jian",
                        user_status="unknown",
                    )
                ],
            )
        ],
    )
    response = asyncio.run(AiProvider(settings=Settings(AI_PROVIDER="dev")).explain_tokens(payload))
    assert len(response.explanations) == 1
    assert response.explanations[0].word == "看见"
    assert "nhìn thấy" in response.explanations[0].meaning_vi


def test_remote_analyze_coerces_fenced_json_and_normalizes_statuses() -> None:
    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": """```json
{"original_text":"ignored","sentences":[{"text":"你看见他吗？","translation_vi":"Bạn có thấy anh ấy không?","natural_explanation_vi":"Người nói đang hỏi bạn có nhìn thấy hoặc gặp người đó không.","tokens":[{"text":"你","pinyin":"ni","meaning_vi_brief":"bạn","token_type":"pronoun","is_learnable":true,"confidence":0.99},{"text":"看见","pinyin":"kan jian","meaning_vi_brief":"nhìn thấy","token_type":"verb","is_learnable":true,"confidence":0.98},{"text":"他","pinyin":"ta","meaning_vi_brief":"anh ấy","token_type":"pronoun","is_learnable":true,"confidence":0.99},{"text":"吗","pinyin":"ma","meaning_vi_brief":"trợ từ nghi vấn","token_type":"particle","is_learnable":true,"confidence":0.99},{"text":"？","pinyin":null,"meaning_vi_brief":null,"token_type":"word","is_learnable":true,"confidence":1.0}]}]}
```"""
                        }
                    }
                ]
            },
        )
    )
    provider = AiProvider(
        settings=Settings(
            AI_PROVIDER="openai_compatible",
            AI_API_URL="https://example.test/v1/chat/completions",
            AI_MODEL="demo-model",
        ),
        http_transport=transport,
    )

    response = asyncio.run(provider.analyze_text("你看见他吗？"))

    assert response.original_text == "你看见他吗？"
    assert [token.text for token in response.sentences[0].tokens] == ["你", "看见", "他", "吗", "？"]
    assert [token.status for token in response.sentences[0].tokens] == [
        "unselected",
        "unselected",
        "unselected",
        "unselected",
        "ignored",
    ]
    assert response.sentences[0].tokens[-1].token_type == "punctuation"


def test_remote_analyze_splits_multiline_text_and_merges_sentence_results() -> None:
    responses = {
        "第一句。": {
            "sentences": [
                {
                    "text": "第一句。",
                    "translation_vi": "Câu thứ nhất.",
                    "natural_explanation_vi": "Đây là câu đầu tiên.",
                    "tokens": [
                        {
                            "text": "第一句",
                            "pinyin": "di yi ju",
                            "meaning_vi_brief": "câu thứ nhất",
                            "token_type": "noun",
                            "is_learnable": True,
                            "confidence": 0.98,
                        },
                        {
                            "text": "。",
                            "token_type": "word",
                            "is_learnable": True,
                            "confidence": 1.0,
                        },
                    ],
                }
            ]
        },
        "第二句。": {
            "sentences": [
                {
                    "text": "第二句。",
                    "translation_vi": "Câu thứ hai.",
                    "natural_explanation_vi": "Đây là câu tiếp theo.",
                    "tokens": [
                        {
                            "text": "第二句",
                            "pinyin": "di er ju",
                            "meaning_vi_brief": "câu thứ hai",
                            "token_type": "noun",
                            "is_learnable": True,
                            "confidence": 0.97,
                        },
                        {
                            "text": "。",
                            "token_type": "word",
                            "is_learnable": True,
                            "confidence": 1.0,
                        },
                    ],
                }
            ]
        },
    }
    call_texts: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode("utf-8"))
        user_prompt = payload["messages"][1]["content"]
        text = user_prompt.split("Nội dung:\n", 1)[1]
        call_texts.append(text)
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(responses[text], ensure_ascii=False)
                        }
                    }
                ]
            },
        )

    provider = AiProvider(
        settings=Settings(
            AI_PROVIDER="openai_compatible",
            AI_API_URL="https://example.test/v1/chat/completions",
            AI_MODEL="demo-model",
        ),
        http_transport=httpx.MockTransport(handler),
    )

    response = asyncio.run(provider.analyze_text("第一句。\n第二句。"))

    assert call_texts == ["第一句。", "第二句。"]
    assert [sentence.text for sentence in response.sentences] == ["第一句。", "第二句。"]
    assert [sentence.sentence_index for sentence in response.sentences] == [0, 1]
    assert response.sentences[0].tokens[0].text == "第一句"
    assert response.sentences[1].tokens[0].text == "第二句"


def test_remote_explain_splits_selected_sentences_and_merges_results() -> None:
    call_payloads: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode("utf-8"))
        call_payloads.append(payload)
        prompt = payload["messages"][1]["content"]
        request_json = json.loads(prompt.split("Payload:\n", 1)[1])
        sentence_text = request_json["sentences"][0]["text"]
        word = request_json["sentences"][0]["tokens"][0]["text"]
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "explanations": [
                                        {
                                            "word": word,
                                            "pinyin": "demo",
                                            "meaning_vi": f"nghĩa của {word}",
                                            "meaning_in_context_vi": f"giải thích trong câu {sentence_text}",
                                            "part_of_speech": "noun",
                                            "usage_note_vi": "ghi chú",
                                            "examples": [
                                                {"zh": sentence_text, "vi": "ví dụ"}
                                            ],
                                            "difficulty_suggestion": "medium",
                                        }
                                    ]
                                },
                                ensure_ascii=False,
                            )
                        }
                    }
                ]
            },
        )

    payload = ExplainTokensRequest(
        original_text="第一句。\n第二句。",
        sentences=[
            ExplainSentenceRequest(
                sentence_index=0,
                text="第一句。",
                translation_vi="Câu thứ nhất.",
                natural_explanation_vi="Giải thích 1.",
                tokens=[
                    ExplainTokenRequestItem(
                        token_index=0,
                        text="第一句",
                        pinyin="di yi ju",
                        meaning_vi_brief="câu thứ nhất",
                        user_status="unknown",
                    )
                ],
            ),
            ExplainSentenceRequest(
                sentence_index=1,
                text="第二句。",
                translation_vi="Câu thứ hai.",
                natural_explanation_vi="Giải thích 2.",
                tokens=[
                    ExplainTokenRequestItem(
                        token_index=0,
                        text="第二句",
                        pinyin="di er ju",
                        meaning_vi_brief="câu thứ hai",
                        user_status="review",
                    )
                ],
            ),
        ],
    )
    provider = AiProvider(
        settings=Settings(
            AI_PROVIDER="openai_compatible",
            AI_API_URL="https://example.test/v1/chat/completions",
            AI_MODEL="demo-model",
        ),
        http_transport=httpx.MockTransport(handler),
    )

    response = asyncio.run(provider.explain_tokens(payload))

    assert len(call_payloads) == 2
    assert [item.word for item in response.explanations] == ["第一句", "第二句"]
    assert response.explanations[0].meaning_vi == "nghĩa của 第一句"
    assert response.explanations[1].meaning_vi == "nghĩa của 第二句"


def test_remote_explain_retries_after_invalid_payload() -> None:
    call_count = {"value": 0}

    def handler(_: httpx.Request) -> httpx.Response:
        call_count["value"] += 1
        if call_count["value"] == 1:
            return httpx.Response(200, json={"choices": [{"message": {"content": "not json"}}]})
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": """
{
  "explanations": [
    {
      "word": "看见",
      "pinyin": "kan jian",
      "meaning_vi": "nhìn thấy, thấy được",
      "meaning_in_context_vi": "Trong câu này, 看见他 nghĩa là nhìn thấy anh ấy hoặc có thấy anh ấy hay không.",
      "part_of_speech": "verb",
      "usage_note_vi": "看见 nhấn mạnh kết quả là đã nhìn thấy.",
      "examples": [
        {
          "zh": "你看见我的手机吗？",
          "pinyin": "ni kan jian wo de shou ji ma",
          "vi": "Bạn có thấy điện thoại của tôi không?"
        }
      ],
      "difficulty_suggestion": "medium"
    }
  ]
}
"""
                        }
                    }
                ]
            },
        )

    payload = ExplainTokensRequest(
        original_text="你看见他吗？",
        sentences=[
            ExplainSentenceRequest(
                sentence_index=0,
                text="你看见他吗？",
                translation_vi="Bạn có thấy anh ấy không?",
                tokens=[
                    ExplainTokenRequestItem(
                        token_index=1,
                        text="看见",
                        pinyin="kan jian",
                        user_status="unknown",
                    )
                ],
            )
        ],
    )
    provider = AiProvider(
        settings=Settings(
            AI_PROVIDER="openai_compatible",
            AI_API_URL="https://example.test/v1/chat/completions",
            AI_MODEL="demo-model",
            AI_MAX_RETRIES=1,
        ),
        http_transport=httpx.MockTransport(handler),
    )

    response = asyncio.run(provider.explain_tokens(payload))

    assert call_count["value"] == 2
    assert len(response.explanations) == 1
    assert response.explanations[0].word == "看见"


def test_remote_explain_supports_vietnamese_field_names() -> None:
    payload = ExplainTokensRequest(
        original_text="请刷新页面。",
        sentences=[
            ExplainSentenceRequest(
                sentence_index=1,
                text="请刷新页面。",
                translation_vi="Vui lòng làm mới trang.",
                natural_explanation_vi="Câu này dùng để yêu cầu người khác tải lại hoặc làm mới trang hiện tại.",
                tokens=[
                    ExplainTokenRequestItem(
                        token_index=1,
                        text="刷新",
                        pinyin="shua1 xin1",
                        meaning_vi_brief="làm mới",
                        user_status="unknown",
                    )
                ],
            )
        ],
    )
    provider = AiProvider(
        settings=Settings(
            AI_PROVIDER="openai_compatible",
            AI_API_URL="https://example.test/v1/chat/completions",
            AI_MODEL="demo-model",
        ),
        http_transport=httpx.MockTransport(
            lambda request: httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "message": {
                                "content": """
{
  "original_text": "请刷新页面。",
  "explanations": [
    {
      "sentence_index": 1,
      "token_index": 1,
      "token": "刷新",
      "pinyin": "shuā xīn",
      "tu_loai": "động từ",
      "nghia_tieng_viet": "làm mới, tải lại",
      "nghia_trong_ngu_canh": "làm mới trang hiện tại để nội dung được cập nhật lại",
      "ghi_chu_su_dung": "Từ này thường dùng trong ngữ cảnh công nghệ.",
      "vi_du": [
        {
          "zh": "如果页面没显示完整，请刷新一下。",
          "vi": "Nếu trang chưa hiển thị đầy đủ, vui lòng làm mới một chút."
        }
      ]
    }
  ]
}
"""
                            }
                        }
                    ]
                },
            )
        ),
    )

    response = asyncio.run(provider.explain_tokens(payload))

    assert len(response.explanations) == 1
    assert response.explanations[0].word == "刷新"
    assert response.explanations[0].meaning_vi == "làm mới, tải lại"
    assert response.explanations[0].meaning_in_context_vi == "làm mới trang hiện tại để nội dung được cập nhật lại"
    assert response.explanations[0].part_of_speech == "động từ"
    assert response.explanations[0].usage_note_vi == "Từ này thường dùng trong ngữ cảnh công nghệ."
    assert response.explanations[0].examples[0].zh == "如果页面没显示完整，请刷新一下。"


def test_remote_explain_supports_variant_example_keys_and_list_usage_notes() -> None:
    payload = ExplainTokensRequest(
        original_text="请刷新页面。",
        sentences=[
            ExplainSentenceRequest(
                sentence_index=1,
                text="请刷新页面。",
                translation_vi="Vui lòng làm mới trang.",
                natural_explanation_vi="Câu này dùng để yêu cầu người khác tải lại hoặc làm mới trang hiện tại.",
                tokens=[
                    ExplainTokenRequestItem(
                        token_index=1,
                        text="刷新",
                        pinyin="shua1 xin1",
                        meaning_vi_brief="làm mới",
                        user_status="unknown",
                    )
                ],
            )
        ],
    )
    provider = AiProvider(
        settings=Settings(
            AI_PROVIDER="openai_compatible",
            AI_API_URL="https://example.test/v1/chat/completions",
            AI_MODEL="demo-model",
        ),
        http_transport=httpx.MockTransport(
            lambda request: httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "message": {
                                "content": """
{
  "explanations": [
    {
      "token": "刷新",
      "pinyin": "shuā xīn",
      "tu_loai": "động từ",
      "nghia_tieng_viet": "làm mới, tải lại",
      "nghia_trong_ngu_canh": "làm mới trang hiện tại",
      "ghi_chu_su_dung": [
        "刷新 rất thường gặp trong ngữ cảnh công nghệ.",
        "Dùng khi cần cập nhật lại trang."
      ],
      "vi_du": [
        {
          "chinese": "网页没有更新，请刷新一下。",
          "vietnamese": "Trang chưa cập nhật, hãy làm mới một chút."
        }
      ]
    }
  ]
}
"""
                            }
                        }
                    ]
                },
            )
        ),
    )

    response = asyncio.run(provider.explain_tokens(payload))

    assert len(response.explanations) == 1
    assert response.explanations[0].usage_note_vi == "刷新 rất thường gặp trong ngữ cảnh công nghệ. Dùng khi cần cập nhật lại trang."
    assert response.explanations[0].examples[0].zh == "网页没有更新，请刷新一下。"
    assert response.explanations[0].examples[0].vi == "Trang chưa cập nhật, hãy làm mới một chút."


def test_remote_explain_supports_cau_trung_and_nghia_vi_example_keys() -> None:
    payload = ExplainTokensRequest(
        original_text="你看见他吗？",
        sentences=[
            ExplainSentenceRequest(
                sentence_index=0,
                text="你看见他吗？",
                translation_vi="Bạn có thấy anh ấy không?",
                natural_explanation_vi="Người nói đang hỏi bạn có nhìn thấy hoặc gặp người đó không.",
                tokens=[
                    ExplainTokenRequestItem(
                        token_index=3,
                        text="吗",
                        pinyin="ma",
                        meaning_vi_brief="trợ từ nghi vấn",
                        user_status="unknown",
                    )
                ],
            )
        ],
    )
    provider = AiProvider(
        settings=Settings(
            AI_PROVIDER="openai_compatible",
            AI_API_URL="https://example.test/v1/chat/completions",
            AI_MODEL="demo-model",
        ),
        http_transport=httpx.MockTransport(
            lambda request: httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "message": {
                                "content": """
{
  "explanations": [
    {
      "token": "吗",
      "pinyin": "ma",
      "tu_loai": "trợ từ nghi vấn",
      "nghia_tieng_viet": "trợ từ dùng để tạo câu hỏi yes/no",
      "nghia_trong_ngu_canh": "đặt cuối câu để hỏi xem có thấy anh ấy không",
      "ghi_chu_su_dung": "Dùng rất phổ biến trong khẩu ngữ.",
      "vi_du": [
        {
          "cau_trung": "你今天有空吗？",
          "pinyin": "Nǐ jīntiān yǒu kòng ma?",
          "nghia_vi": "Hôm nay bạn có rảnh không?"
        }
      ]
    }
  ]
}
"""
                            }
                        }
                    ]
                },
            )
        ),
    )

    response = asyncio.run(provider.explain_tokens(payload))

    assert len(response.explanations) == 1
    assert response.explanations[0].word == "吗"
    assert response.explanations[0].examples[0].zh == "你今天有空吗？"
    assert response.explanations[0].examples[0].vi == "Hôm nay bạn có rảnh không?"


def test_remote_explain_supports_direct_results_items_with_loai_tu_and_meaning_vi_examples() -> None:
    payload = ExplainTokensRequest(
        original_text="这个陪玩师有过连续拒绝新用户订单的情况。",
        sentences=[
            ExplainSentenceRequest(
                sentence_index=0,
                text="这个陪玩师有过连续拒绝新用户订单的情况。",
                translation_vi="Người này từng liên tục từ chối đơn của người dùng mới.",
                natural_explanation_vi="Câu này mô tả một hành vi lặp lại nhiều lần.",
                tokens=[
                    ExplainTokenRequestItem(
                        token_index=3,
                        text="连续",
                        pinyin="lián xù",
                        meaning_vi_brief="liên tục",
                        user_status="unknown",
                    )
                ],
            )
        ],
    )
    provider = AiProvider(
        settings=Settings(
            AI_PROVIDER="openai_compatible",
            AI_API_URL="https://example.test/v1/chat/completions",
            AI_MODEL="demo-model",
        ),
        http_transport=httpx.MockTransport(
            lambda request: httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "message": {
                                "content": """
{
  "original_text": "这个陪玩师有过连续拒绝新用户订单的情况。",
  "results": [
    {
      "sentence_index": 0,
      "token_index": 3,
      "token": "连续",
      "pinyin": "lián xù",
      "loai_tu": "phó từ",
      "nghia_tieng_viet": "liên tục, nối tiếp nhau không ngắt quãng",
      "nghia_trong_ngu_canh": "chỉ việc từ chối đơn xảy ra nhiều lần liền nhau",
      "ghi_chu_su_dung": "连续 bổ nghĩa cho động từ phía sau.",
      "vi_du": [
        {
          "chinese": "他连续三天没有处理客户消息。",
          "pinyin": "Tā liánxù sān tiān méiyǒu chǔlǐ kèhù xiāoxi.",
          "meaning_vi": "Anh ấy đã không xử lý tin nhắn khách hàng suốt ba ngày liên tiếp."
        }
      ]
    }
  ]
}
"""
                            }
                        }
                    ]
                },
            )
        ),
    )

    response = asyncio.run(provider.explain_tokens(payload))

    assert len(response.explanations) == 1
    assert response.explanations[0].word == "连续"
    assert response.explanations[0].part_of_speech == "phó từ"
    assert response.explanations[0].meaning_vi == "liên tục, nối tiếp nhau không ngắt quãng"
    assert response.explanations[0].examples[0].vi == "Anh ấy đã không xử lý tin nhắn khách hàng suốt ba ngày liên tiếp."


def test_remote_explain_supports_hanzi_and_nghia_vi_example_keys() -> None:
    payload = ExplainTokensRequest(
        original_text="这个陪玩师有过连续拒绝新用户订单的情况。",
        sentences=[
            ExplainSentenceRequest(
                sentence_index=0,
                text="这个陪玩师有过连续拒绝新用户订单的情况。",
                translation_vi="Người này từng liên tục từ chối đơn của người dùng mới.",
                natural_explanation_vi="Câu này mô tả hành vi lặp lại nhiều lần.",
                tokens=[
                    ExplainTokenRequestItem(
                        token_index=3,
                        text="连续",
                        pinyin="lián xù",
                        meaning_vi_brief="liên tục",
                        user_status="unknown",
                    )
                ],
            )
        ],
    )
    provider = AiProvider(
        settings=Settings(
            AI_PROVIDER="openai_compatible",
            AI_API_URL="https://example.test/v1/chat/completions",
            AI_MODEL="demo-model",
        ),
        http_transport=httpx.MockTransport(
            lambda request: httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "message": {
                                "content": """
{
  "results": [
    {
      "sentence_index": 0,
      "token_index": 3,
      "token": "连续",
      "pinyin": "lián xù",
      "tu_loai": "phó từ",
      "nghia_tieng_viet": "liên tục, không gián đoạn",
      "nghia_trong_ngu_canh": "chỉ việc từ chối đơn xảy ra nhiều lần liền nhau",
      "ghi_chu_su_dung": "连续 nhấn mạnh tính lặp lại liền mạch.",
      "vi_du": [
        {
          "hanzi": "他连续三天没有处理工单，所以主管提醒了他。",
          "pinyin": "Tā liánxù sān tiān méiyǒu chǔlǐ gōngdān, suǒyǐ zhǔguǎn tíxǐng le tā.",
          "nghia_vi": "Anh ấy liên tục ba ngày không xử lý phiếu công việc, nên quản lý đã nhắc anh ấy."
        }
      ]
    }
  ]
}
"""
                            }
                        }
                    ]
                },
            )
        ),
    )

    response = asyncio.run(provider.explain_tokens(payload))

    assert len(response.explanations) == 1
    assert response.explanations[0].word == "连续"
    assert response.explanations[0].examples[0].zh == "他连续三天没有处理工单，所以主管提醒了他。"
    assert response.explanations[0].examples[0].vi == "Anh ấy liên tục ba ngày không xử lý phiếu công việc, nên quản lý đã nhắc anh ấy."


def test_remote_provider_without_required_config_falls_back_to_local() -> None:
    provider = AiProvider(
        settings=Settings(
            AI_PROVIDER="openai_compatible",
            AI_API_URL="https://example.test/v1/chat/completions",
            AI_MODEL=None,
        )
    )

    response = asyncio.run(provider.analyze_text("你看见他吗？"))

    assert [token.text for token in response.sentences[0].tokens] == ["你", "看见", "他", "吗", "？"]
    assert provider.runtime_mode() == "local_fallback"


def test_remote_provider_connect_error_falls_back_to_local_analyze() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("boom")

    provider = AiProvider(
        settings=Settings(
            AI_PROVIDER="openai_compatible",
            AI_API_URL="https://example.test/v1/chat/completions",
            AI_MODEL="demo-model",
        ),
        http_transport=httpx.MockTransport(handler),
    )

    response = asyncio.run(provider.analyze_text("你看见他吗？"))

    assert [token.text for token in response.sentences[0].tokens] == ["你", "看见", "他", "吗", "？"]
    assert response.sentences[0].tokens[-1].status == "ignored"


def test_split_text_for_remote_analyze_breaks_lines_and_sentence_punctuation() -> None:
    assert _split_text_for_remote_analyze("第一句。\n第二句？第三句") == [
        "第一句。",
        "第二句？",
        "第三句",
    ]


def test_resolve_analyze_timeout_seconds_scales_for_long_clause_heavy_text() -> None:
    assert _resolve_analyze_timeout_seconds(base_timeout=20.0, text="你看见他吗？") == 20.0
    assert _resolve_analyze_timeout_seconds(
        base_timeout=20.0,
        text="这个陪玩师有过连续拒绝新用户订单的情况，且聊天下单率为0，所以上周被关闭了几天新用户接单通道。",
    ) == 90.0


def test_resolve_explain_timeout_seconds_scales_for_long_or_dense_requests() -> None:
    assert _resolve_explain_timeout_seconds(
        base_timeout=20.0,
        sentence_text="你看见他吗？",
        selected_token_count=1,
    ) == 20.0
    assert _resolve_explain_timeout_seconds(
        base_timeout=20.0,
        sentence_text="这个陪玩师有过连续拒绝新用户订单的情况，且聊天下单率为0，所以上周被关闭了几天新用户接单通道。",
        selected_token_count=1,
    ) == 90.0
    assert _resolve_explain_timeout_seconds(
        base_timeout=20.0,
        sentence_text="短句",
        selected_token_count=4,
    ) == 90.0


def test_normalize_analyze_payload_backfills_known_token_fields() -> None:
    response = _normalize_analyze_payload(
        {
            "sentences": [
                {
                    "text": "你看见他吗？",
                    "translation_vi": "Bạn có thấy anh ấy không?",
                    "natural_explanation_vi": "Người nói đang hỏi bạn có thấy anh ấy không.",
                    "tokens": [
                        {"text": "你", "token_type": "pronoun", "is_learnable": True, "confidence": 0.99},
                        {"text": "看见", "token_type": "verb", "is_learnable": True, "confidence": 0.99},
                        {"text": "？", "token_type": "punctuation", "is_learnable": False, "confidence": 1.0},
                    ],
                }
            ]
        },
        original_text="你看见他吗？",
    )

    assert response.sentences[0].tokens[0].pinyin == "ni"
    assert response.sentences[0].tokens[0].meaning_vi_brief == "bạn"
    assert response.sentences[0].tokens[1].pinyin == "kan jian"
    assert response.sentences[0].tokens[1].meaning_vi_brief == "nhìn thấy"
    assert response.sentences[0].tokens[2].pinyin is None


def test_resolve_request_url_appends_chat_completions_for_v1_base_url() -> None:
    assert (
        _resolve_request_url("https://cc.zhihuiapi.com/v1")
        == "https://cc.zhihuiapi.com/v1/chat/completions"
    )
    assert (
        _resolve_request_url("https://cc.zhihuiapi.com/v1/")
        == "https://cc.zhihuiapi.com/v1/chat/completions"
    )


def test_resolve_request_url_keeps_full_completion_endpoint() -> None:
    assert (
        _resolve_request_url("https://cc.zhihuiapi.com/v1/chat/completions")
        == "https://cc.zhihuiapi.com/v1/chat/completions"
    )
