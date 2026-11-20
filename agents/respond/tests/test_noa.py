import noa

P = {"audience": "Saeed", "name": "Saeed", "signal": "Heart 128 bpm at rest for 22 min", "usual": "62 to 78 bpm", "rule": "R"}


def test_plain_english_within_the_facts_passes():
    assert noa.check_say("Saeed, your heart was at 128 for 22 min, above your usual 62 to 78.", "detect.guardian", "en", P) is None


def test_arabic_with_arabic_indic_digits_from_the_facts_passes():
    assert noa.check_say("لاحظنا أن نبض القلب ١٢٨ لمدة ٢٢ دقيقة، وهو أعلى من المعتاد.", "detect.guardian", "ar", P) is None


def test_doses_are_blocked_in_both_languages():
    p = {**P, "rule": "5 10"}
    assert noa.check_say("Take 5 mg twice a day.", "detect.guardian", "en", p) == "dose"
    assert noa.check_say("تناول ٥ ملغ مرتين في اليوم.", "detect.guardian", "ar", p) == "dose"
    assert noa.check_say("خذ ١٠ وحدات من الأنسولين.", "detect.guardian", "ar", p) == "dose"
    assert noa.check_say("خذ 5 ملجم.", "detect.guardian", "ar", p) == "dose"
    assert noa.check_say("تناول ٥ مليغرام صباحًا.", "detect.guardian", "ar", p) == "dose"
    assert noa.check_say("تناول ١٠ حبات.", "detect.guardian", "ar", p) == "dose"
    assert noa.check_say("خذ ٥ أقراص.", "detect.guardian", "ar", p) == "dose"


def test_diagnosis_is_blocked_in_both_languages():
    assert noa.check_say("You have a stroke.", "detect.guardian", "en", P) == "diagnosis"
    assert noa.check_say("لديك سكتة دماغية.", "detect.guardian", "ar", P) == "diagnosis"
    assert noa.check_say("أنت مصاب بالسكري.", "detect.guardian", "ar", P) == "diagnosis"
    assert noa.check_say("أنت مصابة بجلطة.", "detect.guardian", "ar", P) == "diagnosis"
    assert noa.check_say("تعاني من سكتة.", "detect.guardian", "ar", P) == "diagnosis"


def test_advice_against_emergency_care_is_blocked_in_both_languages():
    assert noa.check_say("You do not need to go to the hospital.", "detect.guardian", "en", P) == "againstEmergency"
    assert noa.check_say("لا داعي للذهاب إلى الطوارئ.", "detect.guardian", "ar", P) == "againstEmergency"
    assert noa.check_say("لا تتصل بالإسعاف.", "detect.guardian", "ar", P) == "againstEmergency"


def test_urging_emergency_care_is_not_blocked():
    assert noa.check_say("Go to the emergency department now.", "detect.guardian", "en", P) is None
    assert noa.check_say("اذهب إلى الطوارئ الآن.", "detect.guardian", "ar", P) is None


def test_a_number_outside_the_facts_is_blocked():
    assert noa.check_say("Your heart was at 140.", "detect.guardian", "en", P) == "number"


def test_per_call_extra_numbers():
    assert noa.check_say("No reminders for 3 months.", "pathway.navigator.n3", "en", {"audience": "S", "name": "S"}) is None
    assert noa.check_say("No reminders for 3 months.", "pathway.navigator.u1", "en", {"audience": "S", "name": "S", "urgent": []}) == "number"


def test_script():
    assert noa.check_say("Saeed, your heart was fast.", "detect.guardian", "ar", P) == "script"
    assert noa.check_say("سعيد", "detect.guardian", "en", P) == "script"


def test_word_limits_55_80_45():
    assert noa.check_say(" ".join(["word"] * 55), "detect.guardian", "en", P) is None
    assert noa.check_say(" ".join(["word"] * 56), "detect.guardian", "en", P) == "length"
    assert noa.check_say(" ".join(["word"] * 80), "referral.courier", "en", P) is None
    assert noa.check_say(" ".join(["word"] * 46), "family.chat", "en", P) == "length"


def test_emergency_words_both_languages():
    for t in ["my arm is weak", "chest pain", "أشعر بألم في الصدر", "ذراعي فيها ضعف", "جدي يشعر بدوخة"]:
        assert noa.EMERGENCY.search(t), t
    for t in ["what happens next?", "متى موعد الفحص؟"]:
        assert not noa.EMERGENCY.search(t), t
