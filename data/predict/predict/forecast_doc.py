"""forecasts/{personId} (contract 2.4) from the synthetic history, the AI.FORECAST points and FHIR family history.

The three drivers follow the web's order (trend, pill, tree). Each is grounded in computed facts; Gemini may
phrase them, and any phrasing that fails validation falls back to fixed text. The action is a rule, never model text.
"""
import re
from datetime import timedelta

from . import family, vitals
from .explain import check
from .forecast import Point
from .risk import classify

AS_OF_TS = f"{vitals.AS_OF.isoformat()}T00:00:00Z"
HISTORY_DAYS = vitals.AS_OF_DAY - vitals.FIRST_DAY + 1
FIRST_DATE = (vitals.DAY0 + timedelta(days=vitals.FIRST_DAY)).isoformat()
LAST_DATE = (vitals.DAY0 + timedelta(days=vitals.LAST_DAY)).isoformat()
METHOD = (f"BigQuery AI.FORECAST (TimesFM) on systolic blood pressure. The synthetic daily series covers "
          f"{len(vitals.DAYS)} days ({FIRST_DATE} to {LAST_DATE}); model input is only the {HISTORY_DAYS} days up to "
          f"story day {vitals.AS_OF_DAY} ({vitals.AS_OF.isoformat()}).")
DRIVER_KINDS = ("trend", "adherence", "family")
ALLOWED = ("blood pressure", "mmhg", "tablet", "dose", "medicine")
DRIVER_PROMPT = (
    "Write three short reasons (each under 90 characters) for a family carer, in this order: the blood-pressure "
    "trend, the missed doses, the family history. Each reason is plain text: no numbering, no labels, no quotes. "
    "Use only the facts given for that reason and only the numbers that appear in them. Do not use the % sign or "
    "the words risk, likely, chance, probability or percent, and do not diagnose or predict illness. Aspirin is not "
    "a blood-pressure medicine: when several daily medicines are listed, call them daily medicines. A relative "
    "marked (deceased) has died: use the past tense. Return JSON {\"drivers\": [\"...\", \"...\", \"...\"]}.")


def _parent_stroke(resources: list[dict], person_id: str) -> dict | None:
    for p in family._parents(resources, person_id):
        for c in p["conditions"]:
            if c["kind"] == family.STROKE:
                return {"relation": p["relation"], "deceased": p["deceased"], "age": c.get("ageAtOnset")}
    return None


def _medicines(resources: list[dict], person_id: str) -> list[str]:
    """The tracked daily medicines with their FHIR dose text, e.g. 'amlodipine 5 mg each evening'."""
    found = {}
    for r in resources:
        if r["resourceType"] == "MedicationStatement" and r.get("status") == "active" and \
                (r.get("subject") or {}).get("reference") == f"Patient/{person_id}":
            name = (r.get("medicationCodeableConcept") or {}).get("text", "")
            found[name] = f"{name} {((r.get('dosage') or [{}])[0]).get('text', '')}".strip()
    return [found[m] for m in vitals.PROFILES[person_id].tracked_meds if m in found]


def facts(person_id: str, rows: list[dict], points: list[Point], resources: list[dict]) -> dict:
    now = vitals.window(rows, vitals.AS_OF_DAY - 6, vitals.AS_OF_DAY)
    before = vitals.window(rows, vitals.AS_OF_DAY - 48, vitals.AS_OF_DAY - 42)  # the week 6 weeks earlier
    mean_now, mean_before = round(vitals.mean(now, "systolic")), round(vitals.mean(before, "systolic"))
    scheduled = sum(r["meds_scheduled"] for r in now)
    missed = scheduled - sum(r["meds_taken"] for r in now)
    last = points[-1]
    parent = _parent_stroke(resources, person_id)
    medicines = _medicines(resources, person_id)
    return {
        "meanNow": mean_now, "delta": mean_now - mean_before, "missed": missed, "scheduled": scheduled,
        "adherence": (scheduled - missed) / scheduled, "upperMax": max(p.upper for p in points),
        "single": len(medicines) == 1, "evening": len(medicines) == 1 and "evening" in medicines[0], "parent": parent,
        "trend": [f"7-day mean morning systolic up to {vitals.AS_OF.isoformat()}: {mean_now} mmHg",
                  f"the week 6 weeks earlier: {mean_before} mmHg, a rise of {mean_now - mean_before} mmHg",
                  # No "%" here: the validator rejects percentages, so the facts must not invite one.
                  f"AI.FORECAST 30 days ahead ({last.date}): {last.value:g} mmHg, forecast range {last.lower:g} to "
                  f"{last.upper:g} mmHg"],
        "adherence_facts": [f"daily medicines: {', '.join(medicines)}" if len(medicines) > 1
                            else f"blood pressure medicine: {medicines[0] if medicines else 'not recorded'}",
                            f"doses missed in the 7 days to {vitals.AS_OF.isoformat()}: {missed} of {scheduled}"],
        "family": ([f"{parent['relation']}{' (deceased)' if parent['deceased'] else ''}: stroke"
                    + (f" at {parent['age']}" if parent["age"] is not None else "")]
                   if parent else ["no stroke is recorded for a parent"]),
    }


def driver_facts(f: dict) -> list[list[str]]:
    return [f["trend"], f["adherence_facts"], f["family"]]


def fallback_drivers(f: dict) -> list[str]:
    tablet = ("Evening blood pressure tablet" if f["evening"] else "Blood pressure tablet") if f["single"] \
        else "Daily medicine doses"
    parent = f["parent"]
    family_text = (f"{parent['relation'].capitalize()} had a stroke" + (f" at {parent['age']}" if parent["age"] else "")
                   if parent else "No stroke is recorded for a parent")
    return [f"Morning blood pressure up {f['delta']} mmHg over 6 weeks, to a 7-day mean of {f['meanNow']} mmHg",
            f"{tablet} missed {f['missed']} times this week",
            family_text]


def action(person_id: str, seed: dict) -> dict:
    """Rule: the first NEARBY family member by priority sets up the pill box."""
    people = seed["people"]
    nearby = sorted((c for c in people[person_id]["circle"] if c["role"] == "NEARBY"
                     and c.get("relation") not in ("neighbour", "friend")), key=lambda c: c.get("priority", 99))
    owner = nearby[0]["memberId"]
    return {"text": f"Share the blood pressure trend with the clinic; {people[owner]['displayName']} "
                    "sets up a weekly pill box", "ownerMemberId": owner}


def series(rows: list[dict], points: list[Point]) -> list[dict]:
    observed = [{"date": r["date"], "systolic": r["systolic"]} for r in vitals.history(rows)]
    ahead = [{"date": p.date, "systolicForecast": p.value, "lower": p.lower, "upper": p.upper} for p in points]
    return observed + ahead


MEDICINES = ("amlodipine", "aspirin", "atorvastatin", "statin", "metformin", "warfarin", "apixaban", "lisinopril",
             "ramipril", "paracetamol", "vitamin", "insulin", "clopidogrel")
BP_MEDICINE = re.compile(r"blood[- ]pressure (tablet|medicine|medication|pill|drug)s?", re.I)


def _medicine_problem(text: str, facts: list[str]) -> str | None:
    source = " ".join(facts).lower()
    for m in MEDICINES:
        if re.search(rf"\b{m}s?\b", text, re.I) and m not in source:
            return f"medicine not in the facts: {m!r}"
    if re.search(r"\baspirin\b", text, re.I) and BP_MEDICINE.search(text):
        return "describes aspirin as a blood-pressure medicine"
    return None


LEADING_MARKER = re.compile(r"^\s*(?:reason\s*\d+\s*[:.)-]|\d+\s*[.)]|[-\u2022*])\s*", re.I)


def diagnose_drivers(f: dict, proposed: list | None) -> list[dict]:
    """Per driver: what was proposed, whether it is used, and the exact reason when it is not."""
    out = []
    for i, (kind, facts_i) in enumerate(zip(DRIVER_KINDS, driver_facts(f))):
        raw = proposed[i] if isinstance(proposed, list) and i < len(proposed) else None
        # A leading list marker ("1.", "Reason 1:") is formatting, not content; everything else is checked as is.
        text = LEADING_MARKER.sub("", raw, count=1) if isinstance(raw, str) else raw
        reason = "no proposal" if raw is None else check(text, facts_i, ALLOWED) or _medicine_problem(text, facts_i)
        out.append({"kind": kind, "proposed": raw, "accepted": reason is None,
                    "reason": reason, "facts": facts_i, "final": " ".join(text.split()) if reason is None else None})
    if isinstance(proposed, list) and len(proposed) != len(DRIVER_KINDS):
        for d in out:
            d["note"] = f"model returned {len(proposed)} drivers, expected {len(DRIVER_KINDS)}"
    return out


def choose_drivers(f: dict, proposed: list | None) -> tuple[list[str], int]:
    """Gemini's drivers where each passes validation against its own facts; fixed text otherwise."""
    fallback = fallback_drivers(f)
    diags = diagnose_drivers(f, proposed)
    return [d["final"] if d["accepted"] else fallback[i] for i, d in enumerate(diags)], sum(d["accepted"] for d in diags)


def build(person_id: str, rows: list[dict], points: list[Point], resources: list[dict], seed: dict,
          proposed_drivers: list | None = None) -> dict:
    f = facts(person_id, rows, points, resources)
    drivers, from_model = choose_drivers(f, proposed_drivers)
    doc = {"asOf": AS_OF_TS, "storyDay": vitals.AS_OF_DAY, "method": METHOD,
           "risks": classify(f["upperMax"], f["adherence"], f["parent"] is not None),
           "drivers": drivers, "action": action(person_id, seed), "series": series(rows, points)}
    return {"doc": doc, "facts": f, "driversFromModel": from_model}
