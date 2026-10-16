from fastapi.testclient import TestClient

import main

BODY = {"incidentId": "i-1", "personId": "margaret", "level": "EMERGENCY", "suspected": "STROKE",
        "findings": ["HR 142"], "hospital": {"id": "h", "name": "H", "etaMin": 9}, "extra": {"kept": True}}


def test_handoff_forwards_body_to_hospital_agent(monkeypatch):
    seen = {}

    async def fake(url, body):
        seen["url"], seen["body"] = url, body
        return {"status": "RECEIVED", "packet": {"text": "PRE-ARRIVAL"}, "fallback": False}

    monkeypatch.setenv("HOSPITAL_AGENT_URL", "https://hospital.example")
    monkeypatch.setattr(main, "send_handoff", fake)
    r = TestClient(main.app).post("/handoff", json=BODY)
    assert r.status_code == 200
    assert r.json() == {"status": "RECEIVED", "packet": {"text": "PRE-ARRIVAL"}, "fallback": False}
    assert seen == {"url": "https://hospital.example", "body": BODY}


def test_handoff_without_hospital_url_fails_without_calling(monkeypatch):
    async def boom(url, body):
        raise AssertionError("must not be called")

    monkeypatch.delenv("HOSPITAL_AGENT_URL", raising=False)
    monkeypatch.setattr(main, "send_handoff", boom)
    r = TestClient(main.app).post("/handoff", json=BODY)
    assert r.status_code == 200 and r.json() == {"status": "FAILED", "fallback": False}
