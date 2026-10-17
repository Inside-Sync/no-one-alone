"""hospital-agent: A2A at POST / plus the POST /handoff fallback, contract 4.4."""
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

# Our logger only: its lines never carry patient data.
_log = logging.getLogger("hospital_agent")
_log.setLevel(logging.INFO)
if not _log.handlers:
    _log.addHandler(logging.StreamHandler(sys.stdout))

pipeline.configure()

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
