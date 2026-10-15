"""Local A2A tests: a real uvicorn server and the real a2a-sdk client from scripts/probe_a2a.py."""
import asyncio

import httpx
import pytest

from scripts.probe_a2a import call
from tests.conftest import HERE, load_json


def run(coro):
    return asyncio.run(coro)


def test_agent_card_is_discoverable_and_advertises_public_url(server_url):
    card = httpx.get(server_url + "/.well-known/agent-card.json").json()
    assert card["name"] == "hospital_agent"
    assert card["supportedInterfaces"][0]["url"].rstrip("/") == server_url
    assert card["supportedInterfaces"][0]["protocolBinding"] == "JSONRPC"


def test_health(server_url):
    assert httpx.get(server_url + "/health").json() == {"service": "hospital-agent", "status": "ok"}


@pytest.mark.parametrize("mode", ["data", "text"])
def test_a2a_message_returns_completed_task_with_packet(server_url, request_body, mode):
    out = run(call(server_url, request_body, mode=mode))
    assert out["taskState"] == "TASK_STATE_COMPLETED"
    assert out["result"] == load_json(HERE / "fixtures" / "packet.stroke.json")


def test_a2a_and_http_fallback_return_the_same_packet(server_url, request_body):
    a2a = run(call(server_url, request_body, mode="data"))["result"]
    http = run(call(server_url, request_body, mode="http"))
    assert http["httpStatus"] == 200
    assert http["result"] == a2a


def test_a2a_invalid_request_returns_contract_error(server_url, request_body):
    request_body["suspected"] = "FLU"
    result = run(call(server_url, request_body, mode="data"))["result"]
    assert result["error"]["code"] == "INVALID_REQUEST"
    assert "suspected" in result["error"]["message"]
    assert "FLU" not in result["error"]["message"], "errors never echo input values"


def test_http_invalid_request_is_400(server_url):
    r = httpx.post(server_url + "/handoff", content=b"not json", headers={"content-type": "application/json"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "INVALID_REQUEST"
    r = httpx.post(server_url + "/handoff", json={"personId": "ba-mai"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "INVALID_REQUEST"
