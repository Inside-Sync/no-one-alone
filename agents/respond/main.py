"""respond-agent. Owner: Tài. Interface: docs/contract.md section 4.3.

Every route returns the contract example until the real agent replaces it,
so core-api can integrate from day one.
"""
from fastapi import FastAPI

app = FastAPI(title="respond-agent")


@app.get("/health")
def health():
    return {"service": "respond-agent", "status": "ok"}


@app.post("/verify")
def verify(body: dict):
    return {"isReal": True, "reason": "stub", "lastKnownWellAt": "2026-10-15T18:55:00Z", "fallback": True}


@app.post("/checkin/turn")
def checkin_turn(body: dict):
    return {"next": {"text": "Mạ ơi, Lan nhờ con hỏi thăm mạ. Mạ có nghe con nói không?", "kind": "VOICE"},
            "done": False, "fallback": True}


@app.post("/triage")
def triage(body: dict):
    return {"level": "EMERGENCY", "reasons": ["stub"], "fallback": True}


@app.post("/plan")
def plan(body: dict):
    return {"messages": [{"memberId": m["memberId"], "text": "stub"} for m in body.get("members", [])],
            "callScript": "stub",
            "personInstruction": {"scriptIds": ["SIT_STILL"], "text": "stub"},
            "fallback": True}


@app.post("/handoff")
def handoff(body: dict):
    return {"status": "RECEIVED", "packet": {"text": "stub"}, "fallback": True}
