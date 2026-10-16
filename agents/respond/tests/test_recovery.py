import base64

from fastapi.testclient import TestClient

import main
import recovery
from tests.test_routes import Voice

client = TestClient(main.app)
EN = {"displayName": "Margaret", "locale": "en-AU", "timezone": "Australia/Sydney"}
VI = {"displayName": "Mai", "locale": "vi-VN", "timezone": "Asia/Ho_Chi_Minh"}
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


def test_templates_follow_locale():
    assert recovery.reminders(EN, PLAN)[1]["text"] == "Time to walk for 15 minutes."
    vi = recovery.reminders(VI, PLAN)
    assert vi[0]["text"] == "Mạ ơi, tới giờ uống aspirin 100 mg rồi."
    assert vi[1]["text"] == "Mạ ơi, tới giờ walk for 15 minutes rồi."


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
    assert "Margaret" in seen[0] and "Ischaemic stroke" in seen[0] and "No driving" in seen[0]


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
