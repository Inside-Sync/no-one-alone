"""respond-agent. Owner: Tài. Interface: docs/contract.md section 4.3."""
import base64
import logging
import os

from fastapi import FastAPI, HTTPException

import checkin
import gcp
import plan
import rules
from hospital_client import send_handoff

log = logging.getLogger("respond")
app = FastAPI(title="respond-agent")
assessor = gcp.GeminiAssessor()
voice = gcp.ChirpVoice()


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
        return rules.triage(body)
    except Exception as e:
        log.warning("triage failed: %s", type(e).__name__)
        return {"level": "EMERGENCY", "reasons": ["rules failed"], "fallback": True}


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
