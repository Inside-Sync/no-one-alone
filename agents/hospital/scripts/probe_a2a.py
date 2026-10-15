"""Real A2A client for hospital-agent. Also the reference for respond-agent's caller.

    python scripts/probe_a2a.py --url http://localhost:8082 --request tests/fixtures/request.stroke.json
    python scripts/probe_a2a.py --url https://hospital-agent-....run.app --token "$(gcloud auth print-identity-token ...)"
    python scripts/probe_a2a.py --url http://localhost:8082 --mode http     # plain-HTTP fallback, same JSON

On Cloud Run, respond-agent gets the token with google.oauth2.id_token.fetch_id_token(Request(), <hospital URL>).
"""
import argparse
import asyncio
import json
import sys
import time
import uuid

import httpx
from a2a.client import create_client
from a2a.client.client import ClientConfig
from a2a.types import Message, Part, Role, SendMessageRequest
from google.protobuf import json_format, struct_pb2


def _part(body: dict, mode: str) -> Part:
    if mode == "text":
        return Part(text=json.dumps(body, ensure_ascii=False))
    value = struct_pb2.Value()
    json_format.ParseDict(body, value)
    return Part(data=value)


async def call(url: str, body: dict, *, token: str | None = None, mode: str = "data", timeout: float = 20) -> dict:
    """Sends one handoff and returns {"transport", "taskState", "cardUrl", "result"}."""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    async with httpx.AsyncClient(timeout=timeout, headers=headers) as http:
        if mode == "http":
            r = await http.post(url.rstrip("/") + "/handoff", json=body)
            return {"transport": "HTTP", "httpStatus": r.status_code, "result": r.json()}
        card = (await http.get(url.rstrip("/") + "/.well-known/agent-card.json")).raise_for_status().json()
        client = await create_client(url, client_config=ClientConfig(streaming=False, httpx_client=http))
        request = SendMessageRequest(message=Message(message_id=str(uuid.uuid4()), role=Role.ROLE_USER, parts=[_part(body, mode)]))
        state, texts = None, []
        async for item in client.send_message(request):
            if item.HasField("task"):
                state = json_format.MessageToDict(item.task.status).get("state")
                texts = [p.text for a in item.task.artifacts for p in a.parts if p.text]
            elif item.HasField("message"):
                texts = [p.text for p in item.message.parts if p.text]
        if len(texts) != 1:
            raise RuntimeError(f"expected one text part in the reply, got {len(texts)} (task state {state})")
        return {"transport": f"A2A JSON-RPC ({mode} part)", "taskState": state,
                "cardUrl": card["supportedInterfaces"][0]["url"], "result": json.loads(texts[0])}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--request", default="tests/fixtures/request.stroke.json")
    ap.add_argument("--token")
    ap.add_argument("--mode", choices=["data", "text", "http"], default="data")
    args = ap.parse_args()
    with open(args.request, encoding="utf-8") as f:
        body = json.load(f)
    t0 = time.perf_counter()
    out = asyncio.run(call(args.url, body, token=args.token, mode=args.mode))
    out["elapsedMs"] = round((time.perf_counter() - t0) * 1000)
    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)
    print()


if __name__ == "__main__":
    main()
