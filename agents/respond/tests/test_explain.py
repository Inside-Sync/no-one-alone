import json
from pathlib import Path
from typing import get_args

import pytest
from fastapi.testclient import TestClient

import explain
import main

client = TestClient(main.app)
WEB_EN = Path(__file__).resolve().parents[3] / "web" / "src" / "locales" / "en" / "testcase.json"
HF_OK = {"explain": "For 3 days take furosemide 80 mg each morning, then go back to 40 mg.",
         "simpler": "Weigh yourself every morning. Noa tells the nurse if it rises by more than 1 kg."}
STROKE_AR = {"explain": "وجدت مراقبة القلب رجفاناً أذينياً متقطعاً، وهو السبب المرجح للجلطة. يؤخذ أبيكسابان ٥ ملغ مرتين في اليوم بدل الأسبرين.",
             "simpler": "يجب الاتصال بالرقم ٩٩٨ إذا ظهرت أعراض جديدة في الوجه أو الذراع أو الكلام."}


class Writer:
    def __init__(self, out):
        self.out, self.seen = out, []

    def __call__(self, system, user):
        self.seen.append((system, user))
        return self.out


def test_valid_english_is_returned_stripped():
    assert explain.validate({"explain": "  " + HF_OK["explain"] + " ", "simpler": HF_OK["simpler"]}, "hf", "en") == HF_OK


def test_a_number_that_is_not_in_the_facts_is_refused():
    assert explain.validate({**HF_OK, "explain": "For 3 days take furosemide 60 mg each morning."}, "hf", "en") is None


def test_arabic_indic_digits_count_as_the_same_numbers():
    assert explain.validate(STROKE_AR, "stroke", "ar") == STROKE_AR
    assert explain.validate({**STROKE_AR, "explain": "يؤخذ أبيكسابان ١٠ ملغ مرتين في اليوم."}, "stroke", "ar") is None


def test_arabic_must_be_in_arabic_script_and_english_must_not_be():
    assert explain.validate({"explain": "Take apixaban 5 mg twice a day.", "simpler": "Call 998."}, "stroke", "ar") is None
    assert explain.validate({"explain": "Take apixaban twice a day.", "simpler": "يجب الاتصال بالإسعاف."}, "stroke", "en") is None


def test_shape_and_length_caps():
    assert explain.validate({"explain": "x" * 500, "simpler": "y" * 160}, "hf", "en") == {"explain": "x" * 500, "simpler": "y" * 160}
    for bad in [None, [], {}, {"explain": "x"}, {"explain": "x", "simpler": "  "}, {"explain": 5, "simpler": "s"},
                {"explain": "x" * 501, "simpler": "s"}, {"explain": "x", "simpler": "y" * 161}]:
        assert explain.validate(bad, "hf", "en") is None


def test_validate_logs_which_rule_failed_and_never_the_text(caplog):
    caplog.set_level("WARNING", logger="explain")
    explain.validate({**HF_OK, "explain": "Take 60 mg."}, "hf", "en")
    explain.validate({**HF_OK, "explain": "اشرب الماء."}, "hf", "en")
    explain.validate({"explain": "x"}, "hf", "en")
    assert [r.getMessage() for r in caplog.records] == ["explain rejected: number", "explain rejected: script", "explain rejected: shape"]


def test_prompt_puts_the_facts_in_user_and_the_language_in_system():
    system, user = explain.prompt("hf", "ar")
    assert "furosemide 80 mg in the morning instead of 40 mg" in user
    assert "Modern Standard Arabic" in system and "Write both fields in plain English." not in system
    assert "Use impersonal, gender-neutral phrasing; do not address the reader with gendered verbs." in system
    system, _ = explain.prompt("hf", "en")
    assert "Write both fields in plain English." in system and "Modern Standard Arabic" not in system


def test_the_route_accepts_the_same_teach_sets_as_the_facts():
    assert set(get_args(main.ExplainIn.model_fields["tkey"].annotation)) == set(explain.FACTS)


@pytest.mark.skipif(not WEB_EN.exists(), reason="web locale not in this checkout")
def test_facts_match_the_web_en_locale():
    teach = json.loads(WEB_EN.read_text(encoding="utf-8"))["teach"]
    assert {k: teach[k]["facts"] for k in explain.FACTS} == explain.FACTS


def test_route_returns_checked_wording(monkeypatch):
    fake = Writer(HF_OK)
    monkeypatch.setattr(main, "explainer", fake)
    r = client.post("/explain", json={"tkey": "hf", "lang": "en"})
    assert r.status_code == 200 and r.json() == HF_OK
    system, user = fake.seen[0]
    assert "Write both fields in plain English." in system and "furosemide 80 mg" in user


def test_route_is_503_when_claude_fails_or_writes_something_unchecked(monkeypatch):
    monkeypatch.setattr(main, "explainer", Writer(None))
    assert client.post("/explain", json={"tkey": "hf", "lang": "en"}).status_code == 503
    monkeypatch.setattr(main, "explainer", Writer({**HF_OK, "explain": "Take 60 mg."}))
    assert client.post("/explain", json={"tkey": "hf", "lang": "en"}).status_code == 503


def test_route_503_when_claude_returns_nothing_logs_no_shape_rejection(monkeypatch, caplog):
    caplog.set_level("WARNING", logger="explain")
    monkeypatch.setattr(main, "explainer", Writer(None))
    assert client.post("/explain", json={"tkey": "hf", "lang": "en"}).status_code == 503
    assert not [r for r in caplog.records if r.getMessage() == "explain rejected: shape"]


def test_route_rejects_unknown_sets_languages_and_facts_from_the_caller(monkeypatch):
    fake = Writer(HF_OK)
    monkeypatch.setattr(main, "explainer", fake)
    assert client.post("/explain", json={"tkey": "nope", "lang": "en"}).status_code == 422
    assert client.post("/explain", json={"tkey": "hf", "lang": "vi"}).status_code == 422
    assert client.post("/explain", json={"tkey": "hf", "lang": "en", "facts": "Take 900 mg."}).status_code == 422
    assert fake.seen == []
