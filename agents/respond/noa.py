"""Family-health panel: per-call prompts and params, checks on what the model writes, the audit line."""
import json
import re

from explain import _ARABIC, _LATIN, numbers

_D = "[0-9٠-٩]"
BLOCKS = [
    ("dose", re.compile(r"\b\d+(?:\.\d+)?\s?(?:mg|mcg|micrograms?|units?|ml)\b", re.I)),
    ("dose", re.compile(_D + r"+(?:[.,٫]" + _D + r"+)?\s*(?:مل+ي?[غج]\w*|م[غج]م?|مل|مي[كق]رو[غج]رام|[غج]رام|وحد(?:ة|ات)|حب(?:ة|ات|وب)|قرص|أقراص)(?![ء-ي])")),
    ("diagnosis", re.compile(r"\byou (?:have|had|are having) (?:a |an )?(?:stroke|heart attack|diabetes|atrial fibrillation|af|cancer)\b", re.I)),
    ("diagnosis", re.compile(r"(?:لديك|عندك|أصبت|مصاب(?:ة)?|تعان(?:ي|ين)\s+من)\s+ب?(?:ال)?(?:سكتة|جلطة|نوبة قلبية|سكري|رجفان|سرطان)")),
    ("againstEmergency", re.compile(r"\b(?:don'?t|do not|no need to|never)\s+(?:need to\s+)?(?:call|go to|visit)\s+(?:the\s+|an?\s+)?(?:998|999|911|hospital|emergency|ambulance)", re.I)),
    ("againstEmergency", re.compile(r"(?:لا\s+(?:داعي|حاجة)\s+(?:لل|إلى\s+|الى\s+)?(?:اتصال|الاتصال|ذهاب|الذهاب)|لا\s+(?:تتصل|تذهب))\s*(?:ب|إلى\s*|الى\s*)?(?:ال)?(?:998|٩٩٨|طوارئ|مستشفى|إسعاف)")),
]
# ponytail: substring match, so "صدر" in "مصدر" also trips it; a false hit only sends the fixed safety line
EMERGENCY = re.compile(r"weak|speech|chest|faint|pain|slur|confus|ضعف|خدر|تنميل|تدل[يى]|كلام|تلعثم|صدر|ألم|وجع|إغماء|اغماء|أغمي|اغمي|دوخة|دوار|تشوش|ارتباك|مشوش|سكتة|جلطة", re.I)
EXTRA_NUMBERS = {"detect.guardian": {"1"}, "home.voice.child": {"2"}, "pathway.navigator.n3": {"3"},
                 "composer.reply": {"998"}, "family.chat": {"998"}}


def max_words(call_id: str) -> int:
    return {"referral.courier": 80, "family.chat": 45}.get(call_id, 55)


def check_say(text: str, call_id: str, lang: str, params: dict) -> str | None:
    t = text.strip()
    if len(t.split()) > max_words(call_id):
        return "length"
    arabic, latin = len(_ARABIC.findall(t)), len(_LATIN.findall(t))
    if (lang == "ar" and (arabic == 0 or arabic < 0.9 * (arabic + latin))) or (lang == "en" and arabic):
        return "script"
    for reason, pattern in BLOCKS:
        if pattern.search(t):
            return reason
    # ponytail: digits only, as in explain.validate; number words ("three") are not checked
    if not numbers(t) <= numbers(json.dumps(params, ensure_ascii=False)) | EXTRA_NUMBERS.get(call_id, set()):
        return "number"
    return None
