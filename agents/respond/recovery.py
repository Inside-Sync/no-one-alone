"""Recovery reminders and summary for respond-agent (contract 4.3). Reminder text is rules only."""
import logging

from lang import lang_of, load_scripts

log = logging.getLogger("recovery")

SUMMARY_MAX = 400
MEDICINES = ["aspirin", "atorvastatin", "amlodipine", "warfarin", "apixaban", "clopidogrel",
             "metformin", "paracetamol", "ibuprofen", "insulin"]


def _key(item: dict) -> dict:
    """The plan item's stable key, passed through to its reminders when core-api set one."""
    return {"key": item["key"]} if item.get("key") else {}


def reminders(person: dict, plan: dict) -> list[dict]:
    tpl = load_scripts()[lang_of(person)]["recovery"]
    out = []
    for m in plan.get("meds") or []:
        if m.get("change") == "Stop":
            continue
        text = tpl["MED"].format(name=m["name"], dose=m.get("dose") or "").replace(" ,", ",").replace("  ", " ")
        out += [{"time": t, "kind": "MED", "text": text, **_key(m)} for t in m["times"]]
    for a in plan.get("activities") or []:
        text = a.get("reminder") or tpl["ACTIVITY"].format(text_lower=a["text"][:1].lower() + a["text"][1:])
        out += [{"time": t, "kind": "ACTIVITY", "text": text, **_key(a)} for t in a["times"]]
    return sorted(out, key=lambda r: r["time"])


def prompt(person: dict, plan: dict) -> str:
    # The summary is written in the person's own language, so an Arabic speaker gets Arabic text and voice.
    language = " Write in plain Modern Standard Arabic, speaking to her respectfully in the feminine." if lang_of(person) == "ar" else ""
    return (f"Write at most 3 short plain sentences to {person['displayName']}, who is going home from hospital. Restate only "
            f"the diagnosis and the doctor's notes below in plain words. Do not add any medicine, dose, advice "
            f"or anything not written below. Plain text only.{language}\nDiagnosis: {plan.get('diagnosis') or ''}\n"
            f"Notes: {plan.get('notes') or ''}")


def summary(person: dict, plan: dict, write) -> tuple[str, bool]:
    notes = plan.get("notes") or ""
    text = (write(prompt(person, plan)) or "").strip()
    listed = " ".join(m["name"] for m in plan.get("meds") or []).lower()
    # ponytail: fixed medicine word list; extend it if the demo plans use other drugs
    if not text or len(text) > SUMMARY_MAX or any(w in text.lower() and w not in listed for w in MEDICINES):
        return notes, True
    return text, False
