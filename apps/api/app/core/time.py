from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo


def now_in_timezone(timezone_name: str) -> datetime:
    return datetime.now(tz=ZoneInfo(timezone_name))


def today_in_timezone(timezone_name: str) -> date:
    return now_in_timezone(timezone_name).date()
