"""hospital-agent. Owner: Minh. Interface: docs/contract.md section 4.4.

One Starlette app:
- A2A (JSON-RPC at POST /, agent card at /.well-known/agent-card.json), built by ADK's to_a2a.
- POST /handoff: the plain-HTTP fallback from contract 4.4, same body, same pipeline.
- GET /health.

A2A_PUBLIC_URL is the URL the agent card advertises; on Cloud Run it must be the service URL,
because A2A clients send messages to the URL in the card.
"""
import json
import logging
import os
import sys
from urllib.parse import urlsplit

from google.adk.a2a.utils.agent_to_a2a import to_a2a
from starlette.requests import Request
from starlette.responses import JSONResponse

from agent import root_agent
from handoff import pipeline
from handoff.contracts import ErrorBody

# One JSON line per request to stdout (Cloud Logging). Only our logger: its lines never carry patient data.
_log = logging.getLogger("hospital_agent")
_log.setLevel(logging.INFO)
if not _log.handlers:
    _log.addHandler(logging.StreamHandler(sys.stdout))

_public = urlsplit(os.environ.get("A2A_PUBLIC_URL", f"http://localhost:{os.environ.get('PORT', '8080')}"))
app = to_a2a(
    root_agent,
    protocol=_public.scheme,
    host=_public.hostname,
    port=_public.port or (443 if _public.scheme == "https" else 80),
)


async def health(_: Request) -> JSONResponse:
    return JSONResponse({"service": "hospital-agent", "status": "ok"})


async def handoff(request: Request) -> JSONResponse:
    try:
        body = await request.json()
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JSONResponse(ErrorBody.of("INVALID_REQUEST", "body must be JSON").to_json(), status_code=400)
    status, result = await pipeline.handle(body)
    return JSONResponse(result, status_code=status)


app.add_route("/health", health, methods=["GET"])
app.add_route("/handoff", handoff, methods=["POST"])
