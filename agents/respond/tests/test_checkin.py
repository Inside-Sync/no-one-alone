import checkin
import rules

AR = {"displayName": "Moza Al Hammadi", "locale": "ar-AE", "callerName": "Khalid"}
MOZA = {"displayName": "Moza Al Hammadi", "locale": "en-AE", "callerName": "Khalid"}


def agent(n):
    return [{"by": "AGENT", "text": "q"} for _ in range(n)]


def body(person=AR, turns=(), no_reply=0, **extra):
    return {"person": person, "turns": list(turns), "noReplyCount": no_reply, **extra}


def audio():
    return {"audioBase64": "AAAA", "mimeType": "audio/webm"}


def fake(result, seen=None):
    def assess(data, mime, ctx):
        if seen is not None:
            seen.append(ctx)
        return result
    return assess


def test_first_turn_ar():
    out = checkin.turn(body(), fake(None))
    assert out["next"]["text"].startswith("مرحباً Moza، معكِ نوا.")
    assert out["next"]["kind"] == "VOICE" and out["next"]["step"] == "OPENING"
    assert out["done"] is False and "transcript" not in out


def test_first_turn_en():
    out = checkin.turn(body(MOZA), fake(None))
    assert out["next"]["text"].startswith("Hello Moza, it's Noa. I noticed your heart has been racing")


def test_slurred_answer_after_repeat_question_is_done():
    seen = []
    res = {"transcript": "السماء زرقاء", "clarity": "SLURRED", "coherent": True, "symptoms": [], "confidence": 0.9}
    out = checkin.turn(body(turns=agent(2), input=audio()), fake(res, seen))
    assert seen[0]["expected"] == "السماء زرقاء في أبوظبي"
    assert out["transcript"] == "السماء زرقاء"
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
    assert out["next"]["text"] == "هل تسمعينني؟ اضغطي نعم أو لا."
    assert out["next"]["step"] == "YES_NO"


def test_yes_no_input_is_done():
    out = checkin.turn(body(turns=agent(1), input={"yesNo": "YES"}), fake(None))
    assert out["done"] is True
    assert not {"next", "transcript", "assessment"} & out.keys()


def test_three_questions_asked_is_done():
    assert checkin.turn(body(MOZA, turns=agent(2)), fake(None))["done"] is False
    assert checkin.turn(body(MOZA, turns=agent(3)), fake(None))["done"] is True


def test_bad_base64_is_like_gemini_down():
    out = checkin.turn(body(input={"audioBase64": "AB!CD", "mimeType": "audio/webm"}), fake({"x": 1}))
    assert out["fallback"] is True and out["assessment"]["clarity"] == "NO_SPEECH"
    assert out["done"] is False and out["next"]


def test_speech_check_is_second_and_slurred_there_ends_with_emergency():
    clear = {"transcript": "Mm yes", "clarity": "CLEAR", "coherent": True, "symptoms": [], "confidence": 0.9,
             "ack": "Thank you."}
    first = checkin.turn(body(MOZA, turns=agent(1), input=audio()), fake(clear))
    assert first["next"]["text"] == ("That's okay, Moza. I'm here with you, let's check your speech together, "
                                     "to be sure. Please repeat after me: The sky is blue in Abu Dhabi.")
    seen = []
    slurred = {"transcript": "th sky iz bloo sid", "clarity": "SLURRED", "coherent": False, "symptoms": [],
               "confidence": 0.8}
    out = checkin.turn(body(MOZA, turns=agent(2), input=audio()), fake(slurred, seen))
    assert seen[0]["expected"] == "the sky is blue in abu dhabi"
    assert out["done"] is True and "next" not in out
    turns = [{"by": "PERSON", "text": "th sky iz bloo sid", "assessment": out["assessment"]}]
    assert rules.triage({"alert": {"kind": "HR_HIGH_NO_MOVEMENT", "hr": 137}, "turns": turns})["level"] == "EMERGENCY"


def test_yes_no_prompts_are_lowercase_so_tts_does_not_spell_them():
    from lang import load_scripts
    for lang in ("en", "ar"):
        prompt = load_scripts()[lang]["yes_no"]
        assert "YES" not in prompt and "NO" not in prompt


def test_a_garbled_or_wordless_repeat_fails_the_speech_check():
    for res in ({"transcript": "blah la la", "clarity": "NO_SPEECH", "coherent": False, "symptoms": [], "confidence": 0.5},
                {"transcript": "I like potatoes", "clarity": "CLEAR", "coherent": False, "symptoms": [], "confidence": 0.7}):
        out = checkin.turn(body(MOZA, turns=agent(2), input=audio()), fake(res))
        assert out["assessment"]["clarity"] == "SLURRED"
        assert out["done"] is True and "next" not in out


def test_a_wordless_first_answer_is_not_a_failed_speech_check():
    res = {"transcript": "", "clarity": "NO_SPEECH", "coherent": False, "symptoms": [], "confidence": 0.5}
    out = checkin.turn(body(MOZA, turns=agent(1), input=audio()), fake(res))
    assert out["assessment"]["clarity"] == "NO_SPEECH"
    assert out["done"] is False



EN_SPEECH_CHECK = {
    "GOOD": "Glad to hear that, Moza! Just to be safe, let's do a quick speech check. Please repeat after me: The sky is blue in Abu Dhabi.",
    "UNSURE": "That's okay, Moza. I'm here with you, let's check your speech together, to be sure. Please repeat after me: The sky is blue in Abu Dhabi.",
    "BAD": "I'm here, Moza. Let's check your speech while I work out what help you need. Please repeat after me: The sky is blue in Abu Dhabi.",
}


def test_speech_check_opening_follows_how_she_says_she_feels():
    for feeling, text in EN_SPEECH_CHECK.items():
        res = {"transcript": "x", "clarity": "CLEAR", "coherent": True, "symptoms": [], "confidence": 0.9, "feeling": feeling}
        out = checkin.turn(body(MOZA, turns=agent(1), input=audio()), fake(res))
        assert out["next"]["text"] == text
        assert "feeling" not in out["assessment"]


def test_speech_check_opening_without_a_feeling_is_the_unsure_one():
    res = {"transcript": "Yes", "clarity": "CLEAR", "coherent": True, "symptoms": [], "confidence": 0.9}
    out = checkin.turn(body(MOZA, turns=agent(1), input=audio()), fake(res))
    assert out["next"]["text"] == EN_SPEECH_CHECK["UNSURE"]
    ar = checkin.turn(body(turns=agent(1), input=audio()), fake(res))
    assert ar["next"]["text"].endswith("السماء زرقاء في أبوظبي.")


def test_each_scripted_question_says_which_step_it_is():
    steps = [checkin.turn(body(MOZA, turns=agent(n), input=audio() if n else None), fake(
        {"transcript": "x", "clarity": "CLEAR", "coherent": True, "symptoms": [], "confidence": 1}))["next"]["step"]
        for n in range(3)]
    assert steps == ["OPENING", "SPEECH_CHECK", "SYMPTOMS"]
