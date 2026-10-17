"""Deterministic verify and triage rules for respond-agent (contract 4.3)."""
import re

ORDER = ["OK", "MONITOR", "COME_NOW", "EMERGENCY"]
EMERGENCY_SIGNS = ("weakness", "chest pain", "fall")
# ponytail: word match with a 2-word negation window; Gemini symptoms cover the rest
SIGN_WORDS = {"weakness": {"arm", "face", "weak", "weakness", "heavy", "numb", "yếu", "tê"},
              "chest pain": {"chest", "ngực"},
              "fall": {"fall", "fell", "fallen", "té", "ngã"},
              "dizziness": {"dizzy", "dizziness", "chóng"}}
NEGATIONS = {"no", "not", "never", "không", "chưa"}


def _words(text: str | None) -> list[str]:
    return re.sub(r"[^\w\s]", " ", (text or "").lower()).split()


def _signs(text: str | None) -> list[str]:
    clauses = re.split(r"[.,;!?…]", (text or "").lower().replace("n't", " not").replace("n’t", " not"))
    return [s for s, words in SIGN_WORDS.items() for w in map(_words, clauses)
            if any(x in words and not NEGATIONS & set(w[max(0, i - 2):i]) for i, x in enumerate(w))]


def verify(body: dict) -> dict:
    alert, window = body["alert"], body.get("window") or []
    base = body.get("person", {}).get("baseline") or {}
    baseline = base.get("nightHr") or base.get("restingHr") or 60
    hr, still = alert["hr"], alert.get("movementMin", 0)
    real = (hr > 120 and still >= 10) or "FALL" in alert.get("kind", "")
    if real:
        reason = f"HR {hr} at rest, baseline {baseline}, no movement for {still} min"
    elif still >= 2 and hr >= baseline + 30:
        reason = f"HR {hr}, still for {still} min: below the HR over 120 for 10 min rule"
    elif still >= 2:
        reason = f"HR {hr} near her baseline {baseline}, resting: not an emergency"
    else:
        reason = f"HR {hr} with movement: active, not an emergency"
    out = {"isReal": real, "reason": reason, "fallback": False}
    if window:
        well = [w for w in window if w.get("moving") and w["hr"] <= baseline + 20]
        out["lastKnownWellAt"] = (well[-1] if well else window[0])["at"]
    return out


def triage(body: dict) -> dict:
    alert, turns = body["alert"], body.get("turns") or []
    level, reasons = "MONITOR", []

    def raise_to(lvl, why):
        nonlocal level
        reasons.extend(why if isinstance(why, list) else [why])
        if ORDER.index(lvl) > ORDER.index(level):
            level = lvl

    people = [t for t in turns if t.get("by") == "PERSON"]
    assessments = [t["assessment"] for t in people if t.get("assessment")]
    if any(a.get("clarity") == "SLURRED" for a in assessments):
        raise_to("EMERGENCY", "slurred speech")
    symptoms = [s for a in assessments for s in a.get("symptoms") or []]
    symptoms += [s for p in people for s in _signs(p.get("text"))]
    for s in dict.fromkeys(symptoms):
        raise_to("EMERGENCY" if s in EMERGENCY_SIGNS else "COME_NOW", s)
    if body.get("noReplyCount", 0) >= 2:
        raise_to("COME_NOW", "no answer")
    if "FALL" in alert.get("kind", ""):
        raise_to("COME_NOW", "fall detected")
    if people and _words(people[-1].get("text")) in (["no"], ["không"]):
        raise_to("COME_NOW", "answered no")
    if alert["hr"] >= 130 and not any(a.get("clarity") == "CLEAR" for a in assessments):
        raise_to("COME_NOW", f"HR {alert['hr']} without activity")
    if alert["hr"] >= 130 and body.get("noReplyCount", 0) >= 2:
        raise_to("EMERGENCY", f"unresponsive with HR {alert['hr']}")
    return {"level": level, "reasons": reasons, "fallback": False}
