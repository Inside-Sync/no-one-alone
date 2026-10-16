"""Language helpers and script loading for respond-agent."""
import json
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from zoneinfo import ZoneInfo


def is_en(person: dict) -> bool:
    return (person.get("locale") or "").lower().startswith("en")


@lru_cache(maxsize=1)
def load_scripts() -> dict:
    return json.loads(Path(__file__).with_name("scripts.json").read_text(encoding="utf-8"))


def fmt_local(iso: str | None, tz: str | None) -> str | None:
    if iso is None:
        return None
    at = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return at.astimezone(ZoneInfo(tz or "Asia/Ho_Chi_Minh")).strftime("%H:%M")
