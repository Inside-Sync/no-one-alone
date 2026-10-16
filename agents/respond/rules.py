"""Deterministic verify and triage rules for respond-agent (contract 4.3)."""
ORDER = ["OK", "MONITOR", "COME_NOW", "EMERGENCY"]


def verify(body: dict) -> dict:
    alert, window = body["alert"], body.get("window") or []
    base = body.get("person", {}).get("baseline") or {}
    baseline = base.get("nightHr") or base.get("restingHr") or 60
    hr, still = alert["hr"], alert.get("movementMin", 0)
    real = (hr >= baseline + 30 and still >= 2) or "FALL" in alert.get("kind", "")
    reason = (f"HR {hr} at rest, baseline {baseline}, no movement for {still} min" if real
              else f"HR {hr} with movement: active, not an emergency")
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
    if symptoms:
        raise_to("COME_NOW", symptoms)
    if body.get("noReplyCount", 0) >= 2:
        raise_to("COME_NOW", "no answer")
    if "FALL" in alert.get("kind", ""):
        raise_to("COME_NOW", "fall detected")
    if people and (people[-1].get("text") or "").strip() in ("Không", "No"):
        raise_to("COME_NOW", "answered no")
    if alert["hr"] >= 130 and not any(a.get("clarity") == "CLEAR" for a in assessments):
        raise_to("COME_NOW", f"HR {alert['hr']} without activity")
    return {"level": level, "reasons": reasons, "fallback": False}
