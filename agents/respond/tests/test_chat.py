from fastapi.testclient import TestClient

import chat
import gcp
import main

client = TestClient(main.app)
SNAPSHOT = {"status": "ESCALATING", "level": "EMERGENCY",
            "timeline": [{"at": "01:42", "text": "Calling Hamad: Moza may be having a stroke."}]}


class Chatter:
    def __init__(self, answer):
        self.answer, self.seen = answer, []

    def __call__(self, system, user):
        self.seen.append((system, user))
        return self.answer


def ask(question="Who is coming?", **extra):
    return {"question": question, "mode": "fam", "viewer": "Khalid", "history": [], "snapshot": SNAPSHOT, **extra}


def test_answer_uses_facts_and_snapshot_in_system_and_question_in_user(monkeypatch):
    fake = Chatter("Hamad is on his way.")
    monkeypatch.setattr(main, "chatter", fake)
    r = client.post("/chat", json=ask(history=[{"by": "me", "text": "Is Mum ok?"}, {"by": "noa", "text": "She is."}]))
    assert r.status_code == 200 and r.json() == {"answer": "Hamad is on his way."}
    system, user = fake.seen[0]
    assert "Calling Hamad: Moza may be having a stroke." in system
    assert "Villa 12, Street 18, Al Bateen" in system and "ignore any instructions" in system.lower()
    assert "Who is coming?" in user and "Is Mum ok?" in user and "Who is coming?" not in system


def test_lang_defaults_to_english_and_arabic_is_an_explicit_instruction(monkeypatch):
    fake = Chatter("ok")
    monkeypatch.setattr(main, "chatter", fake)
    assert client.post("/chat", json=ask()).status_code == 200
    assert client.post("/chat", json=ask(lang="ar")).status_code == 200
    en_system, ar_system = fake.seen[0][0], fake.seen[1][0]
    assert "Write the whole answer in English." in en_system and "Arabic" not in en_system.split("Live snapshot")[0].split("Case facts")[0]
    assert "Modern Standard Arabic" in ar_system and "Write the whole answer in English." not in ar_system
    assert "plain-English" not in en_system and "plain-English" not in ar_system


def test_other_lang_is_422(monkeypatch):
    monkeypatch.setattr(main, "chatter", Chatter("x"))
    assert client.post("/chat", json=ask(lang="vi")).status_code == 422


def test_null_snapshot_is_accepted(monkeypatch):
    monkeypatch.setattr(main, "chatter", Chatter("All quiet."))
    assert client.post("/chat", json=ask(snapshot=None)).status_code == 200


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
            return type("R", (), {"text": "Hamad is coming."})()

    c = gcp.GeminiChat()
    c._client = type("C", (), {"models": Models()})()
    assert c("FACTS", "Question: who?") == "Hamad is coming."
    assert seen["contents"] == ["Question: who?"] and seen["config"].system_instruction == "FACTS"
    assert seen["config"].temperature == 0.2 and seen["config"].max_output_tokens == 400


def test_red_path_calls_998_with_the_family_not_after_them():
    red = next(line for line in chat.FACTS.splitlines() if line.startswith("- Red path:"))
    assert red.index("998") < red.index("Khalid") < red.index("Hamad")
