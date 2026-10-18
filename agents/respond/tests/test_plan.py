import pytest

import plan
from lang import load_scripts

MAI = {"displayName": "Bà Mai", "locale": "vi-VN", "timezone": "Asia/Ho_Chi_Minh", "callerName": "Lan",
       "addressText": "12 Nguyễn Huệ", "dialect": "HUE"}
MARGARET = {"displayName": "Margaret Collins", "locale": "en-AU", "timezone": "Australia/Sydney",
            "callerName": "James", "addressText": "5 Pine St", "dialect": None}
CTX = {"lastKnownWellAt": "2026-10-15T18:55:00Z", "meds": ["aspirin", "amlodipine 5mg"], "allergies": ["penicillin"]}


def mk(person, members, level="EMERGENCY"):
    return {"person": person, "level": level, "context": {**CTX, "findings": ["slurred speech", "no answer"]},
            "members": members}


VI_MEMBERS = [{"memberId": "ong-hung", "displayName": "Ông Hùng", "role": "NEARBY", "locale": "vi-VN", "etaMin": 6},
              {"memberId": "lan", "displayName": "Lan", "role": "DISTANT", "locale": "vi-VN"}]
EN_MEMBERS = [{"memberId": "david", "displayName": "David", "role": "NEARBY", "locale": "en-AU", "etaMin": 6},
              {"memberId": "james", "displayName": "James", "role": "DISTANT", "locale": "en-AU"}]


def by_id(out):
    return {m["memberId"]: m["text"] for m in out["messages"]}


def test_vi_emergency():
    out = plan.plan(mk(MAI, VI_MEMBERS))
    msgs = by_id(out)
    assert "6 phút" in msgs["ong-hung"]
    assert "Ông Hùng" in msgs["lan"]
    assert out["personInstruction"]["scriptIds"] == ["GET_HELP"]
    assert out["personInstruction"]["text"].startswith(load_scripts()["vi"]["speech_result"] + " Mạ ơi, con là Noa đây.")
    assert "01:55" in out["callScript"] and "nói ngọng" in out["callScript"]
    assert out["fallback"] is False


def test_en_emergency():
    out = plan.plan(mk(MARGARET, EN_MEMBERS))
    assert "You are 6 min away" in by_id(out)["david"]
    assert "05:55" in out["callScript"]
    assert "slurred speech" in out["callScript"]
    assert out["personInstruction"]["text"] == (
        "Your voice doesn't sound as clear as normal. It seems you are experiencing sudden slurred speech. "
        "Please stay still while I reach out to your family. Margaret, it's Noa. I'm getting help for you right now. Please stay sitting and don't try to stand up. "
        "I'm right here with you.")
    assert "Địa chỉ" not in out["callScript"] and "phút" not in " ".join(by_id(out).values())


def test_come_now_without_slurred_speech_has_no_result_line():
    out = plan.plan({**mk(MARGARET, EN_MEMBERS, "COME_NOW"), "context": {**CTX, "findings": ["no answer"]}})
    assert out["personInstruction"]["text"] == "Please sit still, don't try to get up. I am asking David to come to you."


def test_nearby_without_eta_uses_address():
    members = [{"memberId": "a", "displayName": "A", "role": "NEARBY", "locale": "vi-VN"}]
    text = by_id(plan.plan(mk(MAI, members)))["a"]
    assert "12 Nguyễn Huệ" in text and "None" not in text


def test_each_member_gets_own_language():
    members = [VI_MEMBERS[0], {**EN_MEMBERS[0], "memberId": "d"}]
    msgs = by_id(plan.plan(mk(MAI, members)))
    assert "phút" in msgs["ong-hung"] and "min away" in msgs["d"]


@pytest.mark.parametrize("person,members", [(MAI, VI_MEMBERS), (MARGARET, EN_MEMBERS)])
@pytest.mark.parametrize("level", ["EMERGENCY", "COME_NOW", "MONITOR"])
def test_templates_resolve_and_instruction_sentences_exist(person, members, level):
    nearby_no_eta = [{"memberId": "z", "displayName": "Z", "role": "NEARBY", "locale": person["locale"]}]
    out = plan.plan(mk(person, members + nearby_no_eta, level))
    texts = [out["callScript"], out["personInstruction"]["text"], *by_id(out).values()]
    assert not any("{" in t for t in texts)
    own = load_scripts()["en" if person is MARGARET else "vi"]
    safety = own["safety"]
    helper = members[0]["displayName"]
    name = person["displayName"].split()[0]
    sentences = [safety[i].format(helper=helper, name=name) for i in out["personInstruction"]["scriptIds"]]
    assert out["personInstruction"]["text"] == " ".join([own["speech_result"], *sentences])
