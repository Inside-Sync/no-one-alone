"""hospital-agent client for respond-agent's /handoff (contract 4.3/4.4): A2A first, plain-HTTP fallback.

Self-contained so respond-agent can copy it unchanged. Needs only a2a-sdk==1.2.2 (it brings httpx,
protobuf and google-auth).

    python scripts/hospital_client.py --url http://localhost:8082 --no-auth
    python scripts/hospital_client.py --url https://hospital-agent-....run.app      # service-account ADC token
    python scripts/hospital_client.py --url https://hospital-agent-....run.app --token "$(gcloud auth print-identity-token)"

fetch_id_token needs service-account or metadata-server credentials (Cloud Run); a personal gcloud login uses --token.
"""
import argparse
import asyncio
import json
import logging
import sys
import time
import uuid
from typing import Callable

import httpx
from a2a.client import create_client
from a2a.client.client import ClientConfig
from a2a.types import Message, Part, Role, SendMessageRequest
from google.protobuf import json_format, struct_pb2

# One JSON line per call to stderr (Cloud Logging); codes and timings only, never patient data.
log = logging.getLogger("hospital_client")
log.setLevel(logging.INFO)
if not log.handlers:
    log.addHandler(logging.StreamHandler(sys.stderr))

PACKET_STATUSES = {"COMPLETED", "PARTIAL", "BLOCKED_CONSENT"}
COMPLETED = "TASK_STATE_COMPLETED"
A2A_SHARE = 0.6  # of the timeout, when the HTTP fallback is on


class TransportError(Exception):
    """The call did not produce a hospital-agent reply. The message never contains request or reply content."""


def google_id_token(audience: str) -> str:
    import google.auth.transport.requests
    import google.oauth2.id_token
    return google.oauth2.id_token.fetch_id_token(google.auth.transport.requests.Request(), audience)


async def _via_a2a(http: httpx.AsyncClient, url: str, body: dict) -> object:
    """One A2A message with a data part; returns the parsed JSON from the single text part of the reply."""
    value = struct_pb2.Value()
    json_format.ParseDict(body, value)
    try:
        client = await create_client(url, client_config=ClientConfig(streaming=False, httpx_client=http))
        request = SendMessageRequest(message=Message(message_id=str(uuid.uuid4()), role=Role.ROLE_USER,
                                                     parts=[Part(data=value)]))
        state, texts = None, []
        async for item in client.send_message(request):
            if item.HasField("task"):
                state = json_format.MessageToDict(item.task.status).get("state")
                texts = [p.text for a in item.task.artifacts for p in a.parts if p.text]
            elif item.HasField("message"):
                state, texts = COMPLETED, [p.text for p in item.message.parts if p.text]
    except asyncio.TimeoutError:
        raise
    except Exception as e:  # a2a-sdk and httpx raise many types; only the type name is kept
        raise TransportError(f"a2a: {type(e).__name__}") from None
    if state != COMPLETED or len(texts) != 1:
        raise TransportError(f"a2a: task {state}, {len(texts)} text parts")
    try:
        return json.loads(texts[0])
    except ValueError:
        raise TransportError("a2a: reply is not JSON") from None


async def _via_http(http: httpx.AsyncClient, url: str, body: dict) -> object:
    """POST /handoff. 200, 400 and 502 carry a packet or a contract error body; anything else is a transport failure."""
    try:
        r = await http.post(url + "/handoff", json=body)
    except httpx.HTTPError as e:
        raise TransportError(f"http: {type(e).__name__}") from None
    if r.status_code not in (200, 400, 502):
        raise TransportError(f"http: status {r.status_code}")
    try:
        return r.json()
    except ValueError:
        raise TransportError("http: reply is not JSON") from None


def _classify(reply: object) -> tuple[dict | None, str | None]:
    """(packet, None) for a packet, (None, error code) otherwise."""
    if isinstance(reply, dict) and isinstance(reply.get("error"), dict):
        return None, str(reply["error"].get("code") or "AGENT_ERROR")
    if isinstance(reply, dict) and reply.get("status") in PACKET_STATUSES and isinstance(reply.get("text"), str):
        return reply, None
    return None, "MALFORMED_REPLY"


async def send_handoff(url: str, body: dict, *, auth: bool = True, fallback_http: bool = True,
                       timeout: float = 20.0, token_provider: Callable[[str], str] | None = None,
                       transport: httpx.AsyncBaseTransport | None = None) -> dict:
    """Returns the contract 4.3 reply {"status": "RECEIVED"|"FAILED", "packet"?, "fallback"}; never raises.

    RECEIVED means hospital-agent returned a packet (status COMPLETED, PARTIAL or BLOCKED_CONSENT), not that the
    hospital confirmed receipt. fallback is true when the outcome came over the HTTP fallback. One deadline
    (timeout) covers the token, A2A and HTTP; with the fallback on, A2A gets at most 60% of it.
    """
    loop = asyncio.get_running_loop()
    t0 = loop.time()
    deadline = t0 + timeout
    url = url.rstrip("/")
    path, errors, packet, code = "none", [], None, None

    def remaining() -> float:
        return deadline - loop.time()

    try:
        headers = {}
        if auth:
            try:
                token = await asyncio.wait_for(asyncio.to_thread(token_provider or google_id_token, url), remaining())
            except Exception as e:
                raise TransportError(f"token: {type(e).__name__}") from None
            headers["Authorization"] = f"Bearer {token}"
        async with httpx.AsyncClient(headers=headers, timeout=max(remaining(), 0.1), transport=transport) as http:
            for name, attempt in [("a2a", _via_a2a)] + ([("http", _via_http)] if fallback_http else []):
                if remaining() <= 0:
                    errors.append(f"{name}: timeout")
                    break
                path = name
                # A hung A2A call must leave time for the fallback.
                budget = min(remaining(), A2A_SHARE * timeout) if name == "a2a" and fallback_http else remaining()
                try:
                    packet, code = _classify(await asyncio.wait_for(attempt(http, url, body), budget))
                    break
                except TransportError as e:
                    errors.append(str(e))
                except asyncio.TimeoutError:
                    errors.append(f"{name}: timeout")
    except TransportError as e:
        errors.append(str(e))
    except Exception as e:  # never raise into respond-agent's handler
        errors.append(f"client: {type(e).__name__}")

    if packet is None and code is None:
        if errors and errors[0].startswith("token:"):
            code = "TOKEN_UNAVAILABLE"
        elif errors and all(e.endswith("timeout") for e in errors):
            code = "TIMEOUT"
        else:
            code = "TRANSPORT_FAILED"
    result = {"status": "RECEIVED" if packet else "FAILED", "fallback": path == "http"}
    if packet:
        result["packet"] = packet
    # Codes, transport names and exception type names only: never the body, the packet or the token.
    log.info(json.dumps({
        "stage": "hospital_client", "incidentId": body.get("incidentId") if isinstance(body, dict) else None,
        "transport": path, "status": result["status"], "packetStatus": packet["status"] if packet else None,
        "errorCode": code, "errors": errors, "ms": round((loop.time() - t0) * 1000),
    }))
    return result


def main() -> None:
    ap = argparse.ArgumentParser(description="Send one /handoff body to hospital-agent and print the 4.3 reply.")
    ap.add_argument("--url", required=True)
    ap.add_argument("--request", default="tests/fixtures/request.stroke.json")
    ap.add_argument("--no-auth", action="store_true", help="send no identity token (local server)")
    ap.add_argument("--token", help="identity token to send instead of fetching one")
    ap.add_argument("--no-fallback", action="store_true", help="A2A only, no HTTP fallback")
    ap.add_argument("--timeout", type=float, default=20.0)
    args = ap.parse_args()
    with open(args.request, encoding="utf-8") as f:
        body = json.load(f)
    t0 = time.perf_counter()
    provider = (lambda _: args.token) if args.token else None
    out = asyncio.run(send_handoff(args.url, body, auth=not args.no_auth, fallback_http=not args.no_fallback,
                                   timeout=args.timeout, token_provider=provider))
    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)
    print(f"\n{out['status']} in {round((time.perf_counter() - t0) * 1000)} ms", file=sys.stderr)


if __name__ == "__main__":
    main()
