from __future__ import annotations

import httpx


class TelegramClient:
    def __init__(self, bot_token: str | None) -> None:
        self.bot_token = bot_token

    async def send_message(self, chat_id: str, text: str) -> None:
        if not self.bot_token:
            raise RuntimeError("Telegram bot token is not configured.")
        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json={"chat_id": chat_id, "text": text})
            response.raise_for_status()


class ExpoPushClient:
    def __init__(self, endpoint: str) -> None:
        self.endpoint = endpoint

    async def send_push(self, push_token: str, body: str) -> None:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                self.endpoint,
                json={"to": push_token, "sound": "default", "body": body},
                headers={"content-type": "application/json"},
            )
            response.raise_for_status()
