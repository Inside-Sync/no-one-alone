"""respond-agent: verify, check-in, triage, escalation plan and recovery for core-api."""
import base64
import logging
import os
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import chat
import checkin
import gcp
import plan
import recovery
import rules
from hospital_client import send_handoff
from lang import is_en, load_scripts

log = logging.getLogger("respond")
app = FastAPI(title="respond-agent")
assessor = gcp.GeminiAssessor()
voice = gcp.ChirpVoice()
writer = gcp.GeminiWriter()
chatter = gcp.GeminiChat()


@app.get("/health")
def health():
    return {"service": "respond-agent", "status": "ok"}


def add_audio(holder: dict, locale: str) -> bool:
    audio = voice.speak(holder["text"], locale)
    if audio is not None:
        holder["audioBase64"], holder["mimeType"] = base64.b64encode(audio).decode(), "audio/mpeg"
    return audio is not None


@app.post("/verify")
def verify(body: dict):
    try:
        return rules.verify(body)
    except Exception as e:
        log.warning("verify failed: %s", type(e).__name__)
        return {"isReal": True, "reason": "rules failed", "fallback": True}


@app.post("/checkin/turn")
def checkin_turn(body: dict):
    try:
        out = checkin.turn(body, assessor)
        if out.get("next"):
            out["fallback"] = out["fallback"] or not add_audio(out["next"], gcp.locale_for(body["person"]))
        return out
    except Exception as e:
        log.warning("checkin failed: %s", type(e).__name__)
        return {"done": True, "fallback": True}


@app.post("/triage")
def triage(body: dict):
    try:
        out = rules.triage(body)
    except Exception as e:
        log.warning("triage failed: %s", type(e).__name__)
        return {"level": "EMERGENCY", "reasons": ["rules failed"], "fallback": True}
    if out["level"] in ("OK", "MONITOR"):
        try:
            person = body["person"]
            own = load_scripts()["en" if is_en(person) else "vi"]
            closing = {"text": own["goodbye"].format(name=person["displayName"].split(" ")[0])}
            add_audio(closing, gcp.locale_for(person))
            out["closing"] = closing
        except Exception as e:
            log.warning("closing failed: %s", type(e).__name__)
    return out


@app.post("/plan")
def plan_route(body: dict):
    try:
        out = plan.plan(body)
        out["fallback"] = out["fallback"] or not add_audio(out["personInstruction"], gcp.locale_for(body["person"]))
        return out
    except Exception as e:
        log.warning("plan failed: %s", type(e).__name__)
        raise HTTPException(status_code=503, detail="plan failed")


@app.post("/handoff")
async def handoff(body: dict):
    url = os.environ.get("HOSPITAL_AGENT_URL")
    if not url:
        return {"status": "FAILED", "fallback": False}
    return await send_handoff(url, body)


@app.post("/recovery")
def recovery_route(body: dict):
    try:
        person, plan_in = body["person"], body["plan"]
        locale = gcp.locale_for(person)
        text, fallback = recovery.summary(person, plan_in, writer)
        out = {"summary": text, "reminders": recovery.reminders(person, plan_in), "fallback": fallback}
        spoken = {"text": text}
        if add_audio(spoken, locale):
            out["summaryAudioBase64"] = spoken["audioBase64"]
        for r in out["reminders"]:
            add_audio(r, locale)
        return out
    except Exception as e:
        log.warning("recovery failed: %s", type(e).__name__)
        raise HTTPException(status_code=503, detail="recovery failed")


class ChatLine(BaseModel):
    by: Literal["me", "noa"]
    text: str = Field(max_length=2000)


class ChatIn(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    mode: Literal["hosp", "self", "fam"]
    viewer: str | None = Field(default=None, max_length=100)
    history: list[ChatLine] = Field(default=[], max_length=10)
    snapshot: dict | None = None


@app.post("/chat")
def chat_route(body: ChatIn):
    text = chat.answer(body.model_dump(), chatter)
    if text is None:
        raise HTTPException(status_code=503, detail="chat failed")
    return {"answer": text}
