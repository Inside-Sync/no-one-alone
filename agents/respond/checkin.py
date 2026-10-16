"""Scripted check-in turn for respond-agent (contract 4.3)."""
import base64
import binascii
from typing import Callable

from lang import is_en, load_scripts

NO_SPEECH = {"clarity": "NO_SPEECH", "coherent": False, "symptoms": [], "confidence": 0.0}


def turn(body: dict, assess: Callable[[bytes, str, dict], dict | None]) -> dict:
    person, turns, inp = body["person"], body.get("turns") or [], body.get("input") or {}
    lang = "en" if is_en(person) else "vi"
    s = load_scripts()[lang]
    asked = sum(1 for t in turns if t.get("by") == "AGENT")
    out = {"fallback": False}
    slurred = any((t.get("assessment") or {}).get("clarity") == "SLURRED" for t in turns)

    res_ack = None
    if "audioBase64" in inp:
        expected = s["repeat_phrase"] if asked == 2 else None
        try:
            audio = base64.b64decode(inp["audioBase64"], validate=True)
        except binascii.Error:
            audio = None
        res = None if audio is None else assess(
            audio, inp.get("mimeType", ""), {"locale": person.get("locale"), "expected": expected})
        if res is None:
            out["assessment"], out["fallback"] = dict(NO_SPEECH, symptoms=[]), True
        else:
            out["transcript"] = res["transcript"]
            out["assessment"] = {k: v for k, v in res.items() if k not in ("transcript", "ack")}
            slurred = slurred or res.get("clarity") == "SLURRED"
            res_ack = res.get("ack")

    out["done"] = asked >= len(s["questions"]) or "yesNo" in inp or (slurred and asked >= 2)
    if not out["done"]:
        if body.get("noReplyCount", 0) >= 1:
            out["next"] = {"text": s["yes_no"], "kind": "YES_NO"}
        else:
            text = s["questions"][asked].format(
                name=person.get("displayName", ""), caller=person.get("callerName") or s["caller_default"])
            out["next"] = {"text": text, "kind": "VOICE"}
        if res_ack:
            out["next"]["text"] = res_ack + " " + out["next"]["text"]
    return out
