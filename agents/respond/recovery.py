"""Recovery reminders and summary for respond-agent (contract 4.3). Reminder text is rules only."""
import logging

from lang import is_en, load_scripts

log = logging.getLogger("recovery")

SUMMARY_MAX = 400
MEDICINES = ["aspirin", "atorvastatin", "amlodipine", "warfarin", "apixaban", "clopidogrel",
             "metformin", "paracetamol", "ibuprofen", "insulin"]


def reminders(person: dict, plan: dict) -> list[dict]:
    tpl = load_scripts()["en" if is_en(person) else "vi"]["recovery"]
    out = []
    for m in plan.get("meds") or []:
        if m.get("change") == "Stop":
            continue
        text = tpl["MED"].format(name=m["name"], dose=m.get("dose") or "").replace(" ,", ",").replace("  ", " ")
        out += [{"time": t, "kind": "MED", "text": text} for t in m["times"]]
    for a in plan.get("activities") or []:
        text = a.get("reminder") or tpl["ACTIVITY"].format(text_lower=a["text"][:1].lower() + a["text"][1:])
        out += [{"time": t, "kind": "ACTIVITY", "text": text} for t in a["times"]]
    return sorted(out, key=lambda r: r["time"])


def prompt(person: dict, plan: dict) -> str:
    who = person["displayName"] if is_en(person) else 'mạ (call the person "mạ" and yourself "con", in Vietnamese)'
    return (f"Write at most 3 short plain sentences to {who}, who is going home from hospital. Restate only "
            f"the diagnosis and the doctor's notes below in plain words. Do not add any medicine, dose, advice "
            f"or anything not written below. Plain text only.\nDiagnosis: {plan.get('diagnosis') or ''}\n"
            f"Notes: {plan.get('notes') or ''}")


def summary(person: dict, plan: dict, write) -> tuple[str, bool]:
    notes = plan.get("notes") or ""
    text = (write(prompt(person, plan)) or "").strip()
    listed = " ".join(m["name"] for m in plan.get("meds") or []).lower()
    # ponytail: fixed medicine word list; extend it if the demo plans use other drugs
    if not text or len(text) > SUMMARY_MAX or any(w in text.lower() and w not in listed for w in MEDICINES):
        return notes, True
    return text, False
