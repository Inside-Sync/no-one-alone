"""Messages, call script and safety instruction for respond-agent (contract 4.3)."""
from lang import fmt_local, is_en, load_scripts

SAFETY_IDS = {"EMERGENCY": ["GET_HELP"], "COME_NOW": ["SIT_STILL", "HELP_COMING"]}


def plan(body: dict) -> dict:
    person, level, ctx, members = body["person"], body["level"], body.get("context") or {}, body["members"]
    scripts = load_scripts()
    own = scripts["en" if is_en(person) else "vi"]
    name, address = person["displayName"], person.get("addressText") or ""
    nearby = next((m for m in members if m["role"] == "NEARBY"), None)
    helper = nearby["displayName"] if nearby else own["caller_default"]

    messages = []
    for m in members:
        s = scripts["en" if is_en(m) else "vi"]
        key = "DISTANT" if m["role"] != "NEARBY" else "NEARBY" if m.get("etaMin") is not None else "NEARBY_NO_ETA"
        text = s["messages"][key].format(
            name=name, problem=s["problems"].get(level, s["problems"]["COME_NOW"]),
            eta=m.get("etaMin"), address=address, helper=helper)
        messages.append({"memberId": m["memberId"], "text": text})

    findings = ", ".join(own["findings"].get(f, f) for f in ctx.get("findings") or [])
    call_script = own["call_script"].format(
        address=address, name=name, findings=findings,
        lkw=fmt_local(ctx.get("lastKnownWellAt"), person.get("timezone")) or own["unknown"],
        meds=", ".join(ctx.get("meds") or []), allergies=", ".join(ctx.get("allergies") or []))

    ids = SAFETY_IDS.get(level, ["HELP_COMING"])
    instruction = " ".join(own["safety"][i].format(helper=helper, name=name.split(" ")[0]) for i in ids)
    if "slurred speech" in (ctx.get("findings") or []):
        instruction = own["speech_result"] + " " + instruction
    return {"messages": messages, "callScript": call_script,
            "personInstruction": {"scriptIds": ids, "text": instruction}, "fallback": False}
