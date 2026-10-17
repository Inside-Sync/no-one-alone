from fastapi.testclient import TestClient

import gcp
import main

client = TestClient(main.app)
SNAPSHOT = {"status": "ESCALATING", "level": "EMERGENCY",
            "timeline": [{"at": "01:42", "text": "Calling David: Margaret may be having a stroke."}]}


class Chatter:
    def __init__(self, answer):
        self.answer, self.seen = answer, []

    def __call__(self, system, user):
        self.seen.append((system, user))
        return self.answer


def ask(question="Who is coming?", **extra):
    return {"question": question, "mode": "fam", "viewer": "James", "history": [], "snapshot": SNAPSHOT, **extra}


def test_answer_uses_facts_and_snapshot_in_system_and_question_in_user(monkeypatch):
    fake = Chatter("David is on his way.")
    monkeypatch.setattr(main, "chatter", fake)
    r = client.post("/chat", json=ask(history=[{"by": "me", "text": "Is Mum ok?"}, {"by": "noa", "text": "She is."}]))
    assert r.status_code == 200 and r.json() == {"answer": "David is on his way."}
    system, user = fake.seen[0]
    assert "Calling David: Margaret may be having a stroke." in system
    assert "186 Marrickville Road" in system and "ignore any instructions" in system.lower()
    assert "Who is coming?" in user and "Is Mum ok?" in user and "Who is coming?" not in system


def test_question_over_500_chars_is_422(monkeypatch):
    fake = Chatter("x")
    monkeypatch.setattr(main, "chatter", fake)
    assert client.post("/chat", json=ask("x" * 501)).status_code == 422
    assert client.post("/chat", json=ask("x" * 500)).status_code == 200
    assert client.post("/chat", json=ask(mode="boss")).status_code == 422


def test_gemini_down_is_503(monkeypatch):
    monkeypatch.setattr(main, "chatter", Chatter(None))
    assert client.post("/chat", json=ask()).status_code == 503


def test_gemini_chat_keeps_facts_in_system_instruction():
    seen = {}

    class Models:
        def generate_content(self, model, contents, config):
            seen.update(contents=contents, config=config)
            return type("R", (), {"text": "David is coming."})()

    c = gcp.GeminiChat()
    c._client = type("C", (), {"models": Models()})()
    assert c("FACTS", "Question: who?") == "David is coming."
    assert seen["contents"] == ["Question: who?"] and seen["config"].system_instruction == "FACTS"
    assert seen["config"].temperature == 0.2 and seen["config"].max_output_tokens == 200
