from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from app.core.settings import get_settings
from app.integrations.ai.provider import AiProvider
from app.schemas.analyze import ExplainSentenceRequest, ExplainTokenRequestItem, ExplainTokensRequest


async def main() -> int:
    settings = get_settings()
    provider = AiProvider(settings=settings)
    remote_ready = (
        settings.ai_provider == "openai_compatible"
        and bool(settings.ai_api_url)
        and bool(settings.ai_model)
        and bool(settings.ai_api_key)
    )

    if not remote_ready:
        print(
            json.dumps(
                {
                    "status": "blocked",
                    "reason": "Remote AI provider is not fully configured in .env.",
                    "provider": settings.ai_provider,
                    "has_api_url": bool(settings.ai_api_url),
                    "has_api_key": bool(settings.ai_api_key),
                    "has_model": bool(settings.ai_model),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 2

    analyze_response = await provider.analyze_text("你看见他吗？")
    tokens = analyze_response.sentences[0].tokens

    explain_request = ExplainTokensRequest(
        original_text=analyze_response.original_text,
        sentences=[
            ExplainSentenceRequest(
                sentence_index=analyze_response.sentences[0].sentence_index,
                text=analyze_response.sentences[0].text,
                translation_vi=analyze_response.sentences[0].translation_vi,
                natural_explanation_vi=analyze_response.sentences[0].natural_explanation_vi,
                tokens=[
                    ExplainTokenRequestItem(
                        token_index=tokens[1].token_index,
                        text=tokens[1].text,
                        pinyin=tokens[1].pinyin,
                        meaning_vi_brief=tokens[1].meaning_vi_brief,
                        user_status="unknown",
                    )
                ],
            )
        ],
    )
    explain_response = await provider.explain_tokens(explain_request)

    print(
        json.dumps(
            {
                "status": "ok",
                "provider": settings.ai_provider,
                "api_url_host": settings.ai_api_url.split("/")[2] if settings.ai_api_url else None,
                "model": settings.ai_model,
                "analyze": {
                    "token_texts": [token.text for token in tokens],
                    "token_statuses": [token.status for token in tokens],
                    "translation_vi": analyze_response.sentences[0].translation_vi,
                },
                "explain": {
                    "count": len(explain_response.explanations),
                    "words": [item.word for item in explain_response.explanations],
                    "first_meaning_vi": (
                        explain_response.explanations[0].meaning_vi
                        if explain_response.explanations
                        else None
                    ),
                },
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
