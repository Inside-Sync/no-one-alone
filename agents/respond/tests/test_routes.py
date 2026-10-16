import base64

from fastapi.testclient import TestClient

import gcp
import main
import rules
from tests.test_plan import MAI, VI_MEMBERS, mk
from tests.test_rules import fixture

client = TestClient(main.app)


class Voice:
    def __init__(self, audio):
        self.audio = audio

    def speak(self, text, locale):
        return self.audio


def turn_body():
    return {"person": MAI, "turns": [], "noReplyCount": 0}


def test_turn_adds_audio(monkeypatch):
    monkeypatch.setattr(main, "voice", Voice(b"mp3"))
    out = client.post("/checkin/turn", json=turn_body()).json()
    assert out["next"]["audioBase64"] == base64.b64encode(b"mp3").decode()
    assert out["next"]["mimeType"] == "audio/mpeg"
    assert out["fallback"] is False


def test_turn_without_tts_keeps_text(monkeypatch):
    monkeypatch.setattr(main, "voice", Voice(None))
    out = client.post("/checkin/turn", json=turn_body()).json()
    assert out["next"]["text"] and "audioBase64" not in out["next"]
    assert out["fallback"] is True


def test_turn_crash_hands_back_to_core_api(monkeypatch):
    monkeypatch.setattr(main, "voice", Voice(b"mp3"))
    assert client.post("/checkin/turn", json={}).json() == {"done": True, "fallback": True}


def test_plan_speaks_person_instruction(monkeypatch):
    monkeypatch.setattr(main, "voice", Voice(b"mp3"))
    out = client.post("/plan", json=mk(MAI, VI_MEMBERS)).json()
    assert out["personInstruction"]["audioBase64"] == base64.b64encode(b"mp3").decode()
    assert out["fallback"] is False
    monkeypatch.setattr(main, "voice", Voice(None))
    out = client.post("/plan", json=mk(MAI, VI_MEMBERS)).json()
    assert out["personInstruction"]["text"] and "audioBase64" not in out["personInstruction"]
    assert out["fallback"] is True


def test_verify_and_triage_use_rules():
    body = fixture("stroke")
    assert client.post("/verify", json=body).json() == rules.verify(body)
    assert client.post("/triage", json=body).json() == rules.triage(body)


def test_triage_crash_is_emergency_not_500(monkeypatch):
    def boom(body):
        raise ValueError("x")
    monkeypatch.setattr(rules, "triage", boom)
    r = client.post("/triage", json={})
    assert r.status_code == 200
    assert r.json()["level"] == "EMERGENCY" and r.json()["fallback"] is True


def test_validate_rejects_off_schema():
    ok = {"transcript": "t", "clarity": "CLEAR", "coherent": True, "symptoms": ["fall", "x"], "confidence": 3}
    assert gcp.validate(ok) == {**ok, "symptoms": ["fall"], "confidence": 1.0}
    assert gcp.validate({**ok, "clarity": "MUMBLED"}) is None
    assert gcp.validate({**ok, "coherent": "yes"}) is None
    assert gcp.validate({"transcript": "t"}) is None


def test_plan_crash_is_503_so_core_api_uses_its_fallback(monkeypatch):
    def boom(body):
        raise ValueError("x")
    monkeypatch.setattr(main.plan, "plan", boom)
    assert client.post("/plan", json=mk(MAI, VI_MEMBERS)).status_code == 503
