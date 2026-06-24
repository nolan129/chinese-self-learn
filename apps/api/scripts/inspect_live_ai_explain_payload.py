from __future__ import annotations

import asyncio
import json
import sys
import argparse
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from app.core.settings import get_settings
from app.integrations.ai.provider import EXPLAIN_SYSTEM_PROMPT, AiProvider
from app.schemas.analyze import ExplainSentenceRequest, ExplainTokenRequestItem, ExplainTokensRequest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--original-text", default="你看见他吗？")
    parser.add_argument("--sentence-text", default="你看见他吗？")
    parser.add_argument("--translation-vi", default="Bạn có thấy anh ấy không?")
    parser.add_argument(
        "--natural-explanation-vi",
        default="Người nói đang hỏi bạn có nhìn thấy hoặc gặp người đó không.",
    )
    parser.add_argument("--token-index", type=int, default=1)
    parser.add_argument("--token-text", default="看见")
    parser.add_argument("--token-pinyin", default="kan jian")
    parser.add_argument("--meaning-vi-brief", default="nhìn thấy")
    parser.add_argument("--user-status", default="unknown")
    parser.add_argument("--sentence-index", type=int, default=0)
    return parser.parse_args()


async def main() -> int:
    args = parse_args()
    settings = get_settings()
    provider = AiProvider(settings=settings)

    payload = ExplainTokensRequest(
        original_text=args.original_text,
        sentences=[
            ExplainSentenceRequest(
                sentence_index=args.sentence_index,
                text=args.sentence_text,
                translation_vi=args.translation_vi,
                natural_explanation_vi=args.natural_explanation_vi,
                tokens=[
                    ExplainTokenRequestItem(
                        token_index=args.token_index,
                        text=args.token_text,
                        pinyin=args.token_pinyin,
                        meaning_vi_brief=args.meaning_vi_brief,
                        user_status=args.user_status,
                    )
                ],
            )
        ],
    )

    user_prompt = (
        "Hãy giải thích các token được chọn trong câu tiếng Trung sau.\n\n"
        "Yêu cầu:\n"
        "1. Chỉ giải thích target_tokens.\n"
        "2. Giải thích nghĩa theo đúng ngữ cảnh câu gốc.\n"
        "3. Nếu token có nhiều nghĩa, ưu tiên nghĩa đang dùng trong câu.\n"
        "4. Cung cấp pinyin, nghĩa tiếng Việt, nghĩa trong ngữ cảnh, loại từ, ghi chú sử dụng và ví dụ.\n"
        "5. Ví dụ nên gần với giao tiếp công việc hoặc đời sống phổ biến.\n"
        "6. Không gợi ý cách phản hồi.\n\n"
        f"Payload:\n{payload.model_dump_json(ensure_ascii=False, indent=2)}"
    )
    raw = await provider._request_json_payload(system_prompt=EXPLAIN_SYSTEM_PROMPT, user_prompt=user_prompt)

    summary = {
        "top_level_keys": sorted(raw.keys()),
        "raw": raw,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
