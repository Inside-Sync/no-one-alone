import json
from datetime import datetime, timedelta
from pathlib import Path

import pytest

import rules

DATA = Path(__file__).resolve().parents[3] / "core-api/src/main/resources/data"
ALERT_AT = datetime(2026, 10, 15, 19, 3)
SEED = json.loads((DATA / "seed.json").read_text(encoding="utf-8"))["people"]


def fixture(name, person="margaret"):
    d = json.loads((DATA / "scenarios" / f"{name}.json").read_text(encoding="utf-8"))
    p = SEED[person]
    at = lambda m: (ALERT_AT - timedelta(minutes=m)).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"person": {"age": p["age"], "baseline": p["baseline"]},
            "alert": {**d["alert"], "at": at(0)},
            "window": [{"at": at(w["minutesBefore"]), "hr": w["hr"], "steps": w["steps"], "moving": w["moving"]}
                       for w in d["window"]]}


def test_stroke_and_fall_are_real_false_alarm_is_not():
    assert rules.verify(fixture("stroke"))["isReal"]
    assert rules.verify(fixture("fall", "ba-mai"))["isReal"]
    assert not rules.verify(fixture("false-alarm"))["isReal"]


def test_last_known_well_is_last_moving_near_baseline_point():
    body = fixture("stroke")
    assert rules.verify(body)["lastKnownWellAt"] == "2026-10-15T18:55:00Z"


def test_empty_window_has_no_last_known_well():
    body = {**fixture("stroke"), "window": []}
    assert "lastKnownWellAt" not in rules.verify(body)


def alert(hr=80, kind="HR_HIGH_NO_MOVEMENT"):
    return {"kind": kind, "hr": hr}


def person(text, **a):
    return {"by": "PERSON", "text": text, "assessment": {"clarity": "CLEAR", "coherent": True, "symptoms": [], **a}}


def test_slurred_anywhere_is_emergency():
    r = rules.triage({"alert": alert(), "turns": [person("Ừ", clarity="SLURRED"), person("Có")]})
    assert r["level"] == "EMERGENCY" and "slurred speech" in r["reasons"]


def test_no_reply_twice_is_come_now():
    r = rules.triage({"alert": alert(), "turns": [], "noReplyCount": 2})
    assert r["level"] == "COME_NOW" and "no answer" in r["reasons"]


def test_high_hr_without_answers_is_come_now():
    assert rules.triage({"alert": alert(142), "turns": []})["level"] == "COME_NOW"


def test_unresponsive_with_high_hr_is_emergency():
    r = rules.triage({"alert": alert(142), "turns": [], "noReplyCount": 2})
    assert r["level"] == "EMERGENCY" and "unresponsive with HR 142" in r["reasons"]


def test_clear_yes_answer_is_monitor():
    r = rules.triage({"alert": alert(80), "turns": [person("Có")]})
    assert r["level"] == "MONITOR" and r["fallback"] is False


@pytest.mark.parametrize("text,level,reason", [
    ("My left arm feels heavy… I can't lift it properly.", "EMERGENCY", "weakness"),
    ("My face feels weak", "EMERGENCY", "weakness"),
    ("I have chest pain", "EMERGENCY", "chest pain"),
    ("I fell over in the kitchen", "EMERGENCY", "fall"),
    ("Tay mạ yếu lắm", "EMERGENCY", "weakness"),
    ("No pain. But I feel dizzy and my heart is fluttering.", "COME_NOW", "dizziness"),
])
def test_how_she_feels_answer_sets_level(text, level, reason):
    r = rules.triage({"alert": alert(), "turns": [person(text)]})
    assert r["level"] == level and reason in r["reasons"]


def test_gemini_symptoms_count_too():
    r = rules.triage({"alert": alert(), "turns": [person("Có", symptoms=["chest pain"])]})
    assert r["level"] == "EMERGENCY" and "chest pain" in r["reasons"]


def test_fall_alert_escalates_even_with_yes():
    r = rules.triage({"alert": fixture("fall")["alert"], "turns": [person("Có")]})
    assert r["level"] == "COME_NOW" and "fall detected" in r["reasons"]


def test_answered_no_is_come_now():
    assert rules.triage({"alert": alert(), "turns": [person("Không")]})["level"] == "COME_NOW"


def test_null_text_does_not_crash():
    assert rules.triage({"alert": alert(), "turns": [{"by": "PERSON", "text": None}]})["level"] == "MONITOR"


def test_answered_no_ignores_punctuation_and_case():
    assert rules.triage({"alert": alert(), "turns": [person("no.")]})["level"] == "COME_NOW"


def test_still_near_baseline_is_resting_not_active():
    body = {"person": {"baseline": {"nightHr": 58}}, "alert": {"kind": "HR_HIGH_NO_MOVEMENT", "hr": 57, "movementMin": 45}}
    r = rules.verify(body)
    assert not r["isReal"] and r["reason"] == "HR 57 near her baseline 58, resting: not an emergency"


@pytest.mark.parametrize("hr,still,real", [(137, 10, True), (137, 9, False), (119, 12, False)])
def test_real_when_hr_over_120_and_still_10_min(hr, still, real):
    body = {"person": {"baseline": {"nightHr": 57}}, "alert": {"kind": "HR_HIGH_NO_MOVEMENT", "hr": hr, "movementMin": still}}
    assert rules.verify(body)["isReal"] is real
