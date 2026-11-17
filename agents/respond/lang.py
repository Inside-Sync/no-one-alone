"""Language helpers and script loading for respond-agent."""
import json
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from zoneinfo import ZoneInfo


def lang_of(person: dict) -> str:
    """The script language for a person or circle member: "ar" for an Arabic locale, otherwise "en"."""
    return "ar" if (person.get("locale") or "").lower().startswith("ar") else "en"


@lru_cache(maxsize=1)
def load_scripts() -> dict:
    return json.loads(Path(__file__).with_name("scripts.json").read_text(encoding="utf-8"))


def fmt_local(iso: str | None, tz: str | None) -> str | None:
    if iso is None:
        return None
    at = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return at.astimezone(ZoneInfo(tz or "Asia/Dubai")).strftime("%H:%M")
