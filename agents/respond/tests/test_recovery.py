import base64

from fastapi.testclient import TestClient

import main
import recovery
from tests.test_routes import Voice

client = TestClient(main.app)
EN = {"displayName": "Moza", "locale": "en-AE", "timezone": "Asia/Dubai"}
AR = {"displayName": "Moza", "locale": "ar-AE", "timezone": "Asia/Dubai"}
PLAN = {
    "staffName": "Dr Nguyen", "diagnosis": "Ischaemic stroke", "notes": "No driving for 4 weeks.",
    "meds": [{"name": "atorvastatin", "dose": "40 mg", "times": ["20:00"]},
             {"name": "aspirin", "dose": "100 mg", "times": ["08:00"]}],
    "activities": [{"text": "Walk for 15 minutes", "times": ["10:00", "16:00"]}],
    "followUps": [],
}


def test_reminders_sorted_one_per_time():
    out = recovery.reminders(EN, PLAN)
    assert [r["time"] for r in out] == ["08:00", "10:00", "16:00", "20:00"]
    assert out[0] == {"time": "08:00", "kind": "MED", "text": "Time for your aspirin, 100 mg."}
    assert out[1]["kind"] == "ACTIVITY"


def test_stopped_medicines_get_no_reminder():
    meds = [{**PLAN["meds"][0], "change": "Increased"}, {**PLAN["meds"][1], "change": "Stop"},
            {"name": "apixaban", "dose": "5 mg", "times": ["08:00"]}]
    texts = [r["text"] for r in recovery.reminders(EN, {**PLAN, "meds": meds})]
    assert "Time for your aspirin, 100 mg." not in texts
    assert "Time for your atorvastatin, 40 mg." in texts and "Time for your apixaban, 5 mg." in texts


def test_templates_follow_locale():
    assert recovery.reminders(EN, PLAN)[1]["text"] == "Time to walk for 15 minutes."
    ar = recovery.reminders(AR, PLAN)
    assert ar[0]["text"] == "حان وقت دوائكِ aspirin 100 mg."
    assert ar[1]["text"] == "حان وقت walk for 15 minutes."


def test_activity_reminder_wording_is_used_as_is():
    plan = {**PLAN, "activities": [{"text": "Walk 20 minutes daily", "times": ["10:00"],
                                    "reminder": "Time for your 20-minute walk."}]}
    assert recovery.reminders(EN, plan)[1]["text"] == "Time for your 20-minute walk."
    assert recovery.reminders(AR, plan)[1]["text"] == "Time for your 20-minute walk."


def test_summary_rejects_unlisted_medicine():
    assert recovery.summary(EN, PLAN, lambda p: "You take warfarin now.") == (PLAN["notes"], True)
    assert recovery.summary(EN, PLAN, lambda p: "Keep taking aspirin.") == ("Keep taking aspirin.", False)


def test_summary_rejects_empty_and_long():
    assert recovery.summary(EN, PLAN, lambda p: "  ") == (PLAN["notes"], True)
    assert recovery.summary(EN, PLAN, lambda p: "x" * 401) == (PLAN["notes"], True)


def test_writer_none_gives_notes_and_fallback():
    assert recovery.summary(EN, PLAN, lambda p: None) == (PLAN["notes"], True)


def test_summary_prompt_has_only_plan_facts():
    seen = []
    recovery.summary(EN, PLAN, lambda p: seen.append(p) or "ok")
    assert "Moza" in seen[0] and "Ischaemic stroke" in seen[0] and "No driving" in seen[0]


def test_arabic_summary_prompt_asks_for_arabic_and_english_one_does_not():
    seen = []
    recovery.summary(AR, PLAN, lambda p: seen.append(p) or "ok")
    recovery.summary(EN, PLAN, lambda p: seen.append(p) or "ok")
    assert "Modern Standard Arabic" in seen[0] and "Modern Standard Arabic" not in seen[1]


class Writer:
    def __init__(self, text):
        self.text = text

    def __call__(self, prompt):
        return self.text


def body():
    return {"person": EN, "plan": PLAN}


def test_route_adds_audio_to_summary_and_reminders(monkeypatch):
    monkeypatch.setattr(main, "voice", Voice(b"mp3"))
    monkeypatch.setattr(main, "writer", Writer("You are home."))
    out = client.post("/recovery", json=body()).json()
    b64 = base64.b64encode(b"mp3").decode()
    assert out["summary"] == "You are home." and out["summaryAudioBase64"] == b64 and out["fallback"] is False
    assert all(r["audioBase64"] == b64 and r["mimeType"] == "audio/mpeg" for r in out["reminders"])


def test_route_survives_voice_none(monkeypatch):
    monkeypatch.setattr(main, "voice", Voice(None))
    monkeypatch.setattr(main, "writer", Writer(None))
    out = client.post("/recovery", json=body()).json()
    assert out["summary"] == PLAN["notes"] and out["fallback"] is True
    assert "summaryAudioBase64" not in out and len(out["reminders"]) == 4
    assert all("audioBase64" not in r for r in out["reminders"])


def test_route_crash_is_503(monkeypatch):
    assert client.post("/recovery", json={}).status_code == 503


def test_reminders_carry_the_plan_items_key_and_items_without_one_get_none():
    plan = {**PLAN, "meds": [{**PLAN["meds"][0], "key": "atorvastatin"}, PLAN["meds"][1]],
            "activities": [{**PLAN["activities"][0], "key": "walk"}]}
    out = recovery.reminders(EN, plan)
    by_text = {r["text"]: r for r in out}
    assert by_text["Time for your atorvastatin, 40 mg."]["key"] == "atorvastatin"
    assert "key" not in by_text["Time for your aspirin, 100 mg."]
    assert {r["key"] for r in out if r["kind"] == "ACTIVITY"} == {"walk"}
