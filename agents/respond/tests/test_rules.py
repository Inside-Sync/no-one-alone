import json
from datetime import datetime, timedelta
from pathlib import Path

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


def test_symptoms_are_listed():
    r = rules.triage({"alert": alert(), "turns": [person("Có", symptoms=["chest pain"])]})
    assert r["level"] == "COME_NOW" and "chest pain" in r["reasons"]


def test_fall_alert_escalates_even_with_yes():
    r = rules.triage({"alert": fixture("fall")["alert"], "turns": [person("Có")]})
    assert r["level"] == "COME_NOW" and "fall detected" in r["reasons"]


def test_answered_no_is_come_now():
    assert rules.triage({"alert": alert(), "turns": [person("Không")]})["level"] == "COME_NOW"


def test_null_text_does_not_crash():
    assert rules.triage({"alert": alert(), "turns": [{"by": "PERSON", "text": None}]})["level"] == "MONITOR"


def agent(text):
    return {"by": "AGENT", "text": text}


def test_no_to_the_limbs_question_is_emergency_weakness():
    turns = [agent("Margaret Collins, it's your No One Alone helper. James asked me to check on you. Can you hear me?"),
             person("No. Hello. Who?"),
             agent("I hear you saying no and hello. Please say after me: the weather is nice today."),
             person("The weather is nice. Nice."),
             agent("That's good to hear. Do you have chest pain or dizziness, or did you fall?"), person("Hey."),
             agent("I hear you. Can you move your arms and legs?"), person("No.")]
    r = rules.triage({"alert": alert(hr=142), "turns": turns})
    assert r["level"] == "EMERGENCY" and "weakness" in r["reasons"]


def test_khong_to_the_vietnamese_limbs_question_is_emergency():
    turns = [agent("Mạ có cử động tay chân được không?"), person("Không.")]
    assert rules.triage({"alert": alert(), "turns": turns})["level"] == "EMERGENCY"


def test_yes_to_the_limbs_question_does_not_raise():
    turns = [agent("Can you move your arms and legs?"), person("Yes, I can.")]
    assert rules.triage({"alert": alert(), "turns": turns})["level"] == "MONITOR"


def test_answered_no_ignores_punctuation_and_case():
    assert rules.triage({"alert": alert(), "turns": [person("no.")]})["level"] == "COME_NOW"


def test_still_near_baseline_is_resting_not_active():
    body = {"person": {"baseline": {"nightHr": 58}}, "alert": {"kind": "HR_HIGH_NO_MOVEMENT", "hr": 57, "movementMin": 45}}
    r = rules.verify(body)
    assert not r["isReal"] and r["reason"] == "HR 57 near her baseline 58, resting: not an emergency"
