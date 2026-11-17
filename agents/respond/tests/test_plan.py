import pytest

import plan
from lang import load_scripts

AR = {"displayName": "Moza Al Hammadi", "locale": "ar-AE", "timezone": "Asia/Dubai", "callerName": "Khalid",
      "addressText": "Villa 12, Street 18, Al Bateen"}
MOZA = {"displayName": "Moza Al Hammadi", "locale": "en-AE", "timezone": "Asia/Dubai",
        "callerName": "Khalid", "addressText": "Villa 12, Street 18, Al Bateen", "dialect": None}
CTX = {"lastKnownWellAt": "2026-10-15T21:22:00Z", "meds": ["aspirin", "amlodipine 5mg"], "allergies": ["penicillin"]}


def mk(person, members, level="EMERGENCY"):
    return {"person": person, "level": level, "context": {**CTX, "findings": ["slurred speech", "no answer"]},
            "members": members}


AR_MEMBERS = [{"memberId": "david", "displayName": "Hamad", "role": "NEARBY", "locale": "ar-AE", "etaMin": 6},
              {"memberId": "james", "displayName": "Khalid", "role": "DISTANT", "locale": "ar-AE"}]
EN_MEMBERS = [{"memberId": "david", "displayName": "Hamad", "role": "NEARBY", "locale": "en-AE", "etaMin": 6},
              {"memberId": "james", "displayName": "Khalid", "role": "DISTANT", "locale": "en-AE"}]


def by_id(out):
    return {m["memberId"]: m["text"] for m in out["messages"]}


def test_ar_emergency():
    out = plan.plan(mk(AR, AR_MEMBERS))
    msgs = by_id(out)
    assert "6 دقيقة" in msgs["david"]
    assert "Hamad" not in msgs["david"] and "Khalid" not in msgs["david"]
    assert "تم تنبيه Hamad" in msgs["james"]
    assert out["personInstruction"]["scriptIds"] == ["GET_HELP"]
    assert out["personInstruction"]["text"] == load_scripts()["ar"]["speech_result"].format(name="Moza")
    assert "01:22" in out["callScript"] and "تلعثم في الكلام" in out["callScript"]
    assert out["fallback"] is False


def test_en_emergency():
    out = plan.plan(mk(MOZA, EN_MEMBERS))
    assert "You are 6 min away" in by_id(out)["david"]
    assert "01:22" in out["callScript"]
    assert "slurred speech" in out["callScript"]
    assert out["personInstruction"]["text"] == (
        "Moza, your speech sounds less clear than usual. Please stay sitting and don't try to stand up, "
        "I'm getting help. I'm here with you.")
    assert "العنوان" not in out["callScript"] and "دقيقة" not in " ".join(by_id(out).values())


def test_come_now_without_slurred_speech_has_no_result_line():
    out = plan.plan({**mk(MOZA, EN_MEMBERS, "COME_NOW"), "context": {**CTX, "findings": ["no answer"]}})
    assert out["personInstruction"]["text"] == "Please sit still, don't try to get up. I am asking Hamad to come to you."


def test_nearby_without_eta_uses_address():
    members = [{"memberId": "a", "displayName": "A", "role": "NEARBY", "locale": "ar-AE"}]
    text = by_id(plan.plan(mk(AR, members)))["a"]
    assert "Villa 12, Street 18, Al Bateen" in text and "None" not in text


def test_each_member_gets_own_language():
    members = [AR_MEMBERS[0], {**EN_MEMBERS[0], "memberId": "d"}]
    msgs = by_id(plan.plan(mk(AR, members)))
    assert "دقيقة" in msgs["david"] and "min away" in msgs["d"]


@pytest.mark.parametrize("person,members", [(AR, AR_MEMBERS), (MOZA, EN_MEMBERS)])
@pytest.mark.parametrize("level", ["EMERGENCY", "COME_NOW", "MONITOR"])
def test_templates_resolve_and_instruction_sentences_exist(person, members, level):
    nearby_no_eta = [{"memberId": "z", "displayName": "Z", "role": "NEARBY", "locale": person["locale"]}]
    out = plan.plan(mk(person, members + nearby_no_eta, level))
    texts = [out["callScript"], out["personInstruction"]["text"], *by_id(out).values()]
    assert not any("{" in t for t in texts)
    own = load_scripts()["en" if person is MOZA else "ar"]
    safety = own["safety"]
    helper = members[0]["displayName"]
    name = person["displayName"].split()[0]
    sentences = [safety[i].format(helper=helper, name=name) for i in out["personInstruction"]["scriptIds"]]
    assert out["personInstruction"]["text"] == own["speech_result"].format(name=name)
    assert all(sentences)
