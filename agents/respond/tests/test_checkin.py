import checkin

MAI = {"displayName": "Bà Mai", "locale": "vi-VN", "callerName": "Lan"}
MARGARET = {"displayName": "Margaret Collins", "locale": "en-AU", "callerName": "James"}


def agent(n):
    return [{"by": "AGENT", "text": "q"} for _ in range(n)]


def body(person=MAI, turns=(), no_reply=0, **extra):
    return {"person": person, "turns": list(turns), "noReplyCount": no_reply, **extra}


def audio():
    return {"audioBase64": "AAAA", "mimeType": "audio/webm"}


def fake(result, seen=None):
    def assess(data, mime, ctx):
        if seen is not None:
            seen.append(ctx)
        return result
    return assess


def test_first_turn_vi():
    out = checkin.turn(body(), fake(None))
    assert out["next"]["text"].startswith("Mạ ơi, Lan nhờ con hỏi thăm mạ")
    assert out["next"]["kind"] == "VOICE"
    assert out["done"] is False and "transcript" not in out


def test_first_turn_en():
    out = checkin.turn(body(MARGARET), fake(None))
    assert out["next"]["text"].startswith("Margaret Collins, it's your No One Alone helper. James asked me")


def test_slurred_answer_after_repeat_question_is_done():
    seen = []
    res = {"transcript": "hôm nay tờ đẹp", "clarity": "SLURRED", "coherent": True, "symptoms": [], "confidence": 0.9}
    out = checkin.turn(body(turns=agent(2), input=audio()), fake(res, seen))
    assert seen[0]["expected"] == "hôm nay trời đẹp"
    assert out["transcript"] == "hôm nay tờ đẹp"
    assert out["assessment"]["clarity"] == "SLURRED"
    assert out["done"] is True


def test_assess_failure_falls_back_and_keeps_asking():
    out = checkin.turn(body(turns=agent(1), input=audio()), fake(None))
    assert out["assessment"]["clarity"] == "NO_SPEECH"
    assert out["fallback"] is True and "transcript" not in out
    assert out["done"] is False and out["next"]["text"]


def test_no_reply_switches_to_yes_no():
    out = checkin.turn(body(turns=agent(1), no_reply=1, input={"noReply": True}), fake(None))
    assert out["next"]["kind"] == "YES_NO"
    assert out["next"]["text"] == "Mạ có nghe con không? Mạ bấm CÓ hoặc KHÔNG."


def test_yes_no_input_is_done():
    out = checkin.turn(body(turns=agent(1), input={"yesNo": "YES"}), fake(None))
    assert out["done"] is True
    assert not {"next", "transcript", "assessment"} & out.keys()


def test_four_questions_asked_is_done():
    assert checkin.turn(body(turns=agent(4)), fake(None))["done"] is True


def test_bad_base64_is_like_gemini_down():
    out = checkin.turn(body(input={"audioBase64": "AB!CD", "mimeType": "audio/webm"}), fake({"x": 1}))
    assert out["fallback"] is True and out["assessment"]["clarity"] == "NO_SPEECH"
    assert out["done"] is False and out["next"]
