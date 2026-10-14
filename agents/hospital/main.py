"""hospital-agent. Owner: Minh. Interface: docs/contract.md section 4.4.

Plain HTTP health check only. Minh replaces this with the ADK A2A server
after the 14/10 spike.
"""
from fastapi import FastAPI

app = FastAPI(title="hospital-agent")


@app.get("/health")
def health():
    return {"service": "hospital-agent", "status": "ok"}
