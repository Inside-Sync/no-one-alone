"""agents/respond/hospital_client.py: status mapping, fallback, auth, deadline and logs; then against a real local server."""
import asyncio
import json
import time

import httpx
import pytest

import hospital_client as hc

from tests.conftest import HERE, load_json

GOLDEN = HERE / "fixtures" / "packet.stroke.json"
TOKEN = "tok-sentinel-123"


def run(coro):
    return asyncio.run(coro)


def send(body, **kw):
    kw.setdefault("auth", False)
    return run(hc.send_handoff("http://hospital.test", body, **kw))


class Calls:
    """Stands in for _via_a2a/_via_http: replies, raises or sleeps, and counts calls."""

    def __init__(self, reply=None, error=None, sleep=0.0):
        self.reply, self.error, self.sleep, self.n = reply, error, sleep, 0

    async def __call__(self, http, url, body):
        self.n += 1
        if self.sleep:
            await asyncio.sleep(self.sleep)
        if self.error:
            raise self.error
        return self.reply


@pytest.fixture
def packet():
    return load_json(GOLDEN)


@pytest.fixture
def stub(monkeypatch):
    def install(a2a: Calls, http: Calls | None = None):
        http = http or Calls(error=AssertionError("HTTP fallback must not run"))
        monkeypatch.setattr(hc, "_via_a2a", a2a)
        monkeypatch.setattr(hc, "_via_http", http)
        return a2a, http
    return install


def last_log(caplog) -> dict:
    lines = [r.getMessage() for r in caplog.records if r.name == "hospital_client"]
    assert lines, "one log line per call"
    return json.loads(lines[-1])


@pytest.mark.parametrize("status", ["COMPLETED", "PARTIAL", "BLOCKED_CONSENT"])
def test_any_packet_is_received_and_passed_through_unchanged(stub, request_body, packet, status):
    packet["status"] = status
    stub(Calls(reply=packet))
    out = send(request_body)
    assert out == {"status": "RECEIVED", "fallback": False, "packet": packet}


@pytest.mark.parametrize("code", ["INVALID_REQUEST", "AGENT_FAILED"])
def test_agent_error_is_failed_without_packet_and_not_retried(stub, request_body, caplog, code):
    a2a, http = stub(Calls(reply={"error": {"code": code, "message": "x"}}))
    out = send(request_body)
    assert out == {"status": "FAILED", "fallback": False}
    assert http.n == 0
    assert last_log(caplog)["errorCode"] == code


@pytest.mark.parametrize("reply", ["not a dict", [], {"status": "RECEIVED", "text": "x"}, {"status": "COMPLETED"},
                                   {"status": "COMPLETED", "text": 3}])
def test_malformed_reply_is_failed(stub, request_body, caplog, reply):
    stub(Calls(reply=reply))
    assert send(request_body) == {"status": "FAILED", "fallback": False}
    assert last_log(caplog)["errorCode"] == "MALFORMED_REPLY"


def test_a2a_transport_failure_falls_back_to_http(stub, request_body, packet, caplog):
    a2a, http = stub(Calls(error=hc.TransportError("a2a: ConnectError")), Calls(reply=packet))
    out = send(request_body)
    assert out == {"status": "RECEIVED", "fallback": True, "packet": packet}
    assert (a2a.n, http.n) == (1, 1)
    log = last_log(caplog)
    assert log["transport"] == "http" and log["errors"] == ["a2a: ConnectError"]


def test_hung_a2a_leaves_time_for_the_http_fallback(stub, request_body, packet, caplog):
    stub(Calls(reply=packet, sleep=5), Calls(reply=packet))
    t0 = time.perf_counter()
    out = send(request_body, timeout=3.0)
    assert time.perf_counter() - t0 < 2.6
    assert out == {"status": "RECEIVED", "fallback": True, "packet": packet}
    assert last_log(caplog)["errors"] == ["a2a: timeout"]


def test_without_fallback_a2a_gets_the_whole_budget(stub, request_body, packet):
    stub(Calls(reply=packet, sleep=0.8))
    assert send(request_body, timeout=1.5, fallback_http=False)["status"] == "RECEIVED"


def test_http_fallback_error_body_is_failed(stub, request_body):
    stub(Calls(error=hc.TransportError("a2a: status 503")),
         Calls(reply={"error": {"code": "AGENT_FAILED", "message": "x"}}))
    assert send(request_body) == {"status": "FAILED", "fallback": True}


def test_both_transports_failing_is_failed(stub, request_body, caplog):
    stub(Calls(error=hc.TransportError("a2a: status 503")), Calls(error=hc.TransportError("http: status 503")))
    assert send(request_body) == {"status": "FAILED", "fallback": True}
    assert last_log(caplog)["errorCode"] == "TRANSPORT_FAILED"


def test_fallback_disabled_makes_no_http_call(stub, request_body):
    a2a, http = stub(Calls(error=hc.TransportError("a2a: status 503")))
    assert send(request_body, fallback_http=False) == {"status": "FAILED", "fallback": False}
    assert http.n == 0


def test_deadline_covers_both_attempts(stub, request_body, packet, caplog):
    stub(Calls(reply=packet, sleep=5), Calls(reply=packet, sleep=5))
    t0 = time.perf_counter()
    assert send(request_body, timeout=1.5) == {"status": "FAILED", "fallback": True}
    assert time.perf_counter() - t0 < 2.5
    log = last_log(caplog)
    assert log["errorCode"] == "TIMEOUT" and log["errors"] == ["a2a: timeout", "http: timeout"]


def test_token_is_fetched_for_the_service_url(stub, request_body, packet):
    seen = []
    stub(Calls(reply=packet))
    out = run(hc.send_handoff("https://hospital.test/", request_body, token_provider=lambda aud: seen.append(aud) or TOKEN))
    assert out["status"] == "RECEIVED"
    assert seen == ["https://hospital.test"]


def test_token_failure_is_failed_without_any_call(stub, request_body, caplog):
    def broken(_):
        raise RuntimeError("no credentials")
    a2a, http = stub(Calls(error=AssertionError("must not run")))
    out = run(hc.send_handoff("https://hospital.test", request_body, token_provider=broken))
    assert out == {"status": "FAILED", "fallback": False}
    assert a2a.n == 0
    log = last_log(caplog)
    assert log["errorCode"] == "TOKEN_UNAVAILABLE" and log["transport"] == "none"


def test_no_auth_never_asks_for_a_token(stub, request_body, packet):
    stub(Calls(reply=packet))
    out = send(request_body, token_provider=lambda _: pytest.fail("token requested with auth=False"))
    assert out["status"] == "RECEIVED"


def test_log_line_has_no_patient_data_or_token(stub, request_body, packet, caplog):
    stub(Calls(error=hc.TransportError("a2a: ConnectError")), Calls(reply=packet))
    run(hc.send_handoff("https://hospital.test", request_body, token_provider=lambda _: TOKEN))
    text = " ".join(r.getMessage() for r in caplog.records)
    for secret in ("Bà Mai", "Ông Hùng", "slurred", "HR 142", "penicillin", "amlodipine", TOKEN):
        assert secret not in text
    log = last_log(caplog)
    assert log["incidentId"] == request_body["incidentId"] and log["packetStatus"] == "COMPLETED"


def http_reply(status, content):
    async def go():
        transport = httpx.MockTransport(lambda req: httpx.Response(status, content=content))
        async with httpx.AsyncClient(transport=transport) as http:
            return await hc._via_http(http, "http://hospital.test", {})
    return asyncio.run(go())


def test_via_http_returns_packet_and_contract_error_bodies():
    assert http_reply(200, b'{"status": "COMPLETED", "text": "x"}') == {"status": "COMPLETED", "text": "x"}
    assert http_reply(400, b'{"error": {"code": "INVALID_REQUEST"}}')["error"]["code"] == "INVALID_REQUEST"
    assert http_reply(502, b'{"error": {"code": "AGENT_FAILED"}}')["error"]["code"] == "AGENT_FAILED"


@pytest.mark.parametrize("status,content", [(503, b"unavailable"), (403, b"forbidden"), (200, b"<html>")])
def test_via_http_other_replies_are_transport_errors(status, content):
    with pytest.raises(hc.TransportError):
        http_reply(status, content)


class Proxy(httpx.AsyncBaseTransport):
    """Forwards to the real server, records method, path and Authorization; can fail A2A."""

    def __init__(self, fail_a2a=False):
        self.inner, self.fail_a2a, self.seen = httpx.AsyncHTTPTransport(), fail_a2a, []

    async def handle_async_request(self, request):
        self.seen.append((request.method, request.url.path, request.headers.get("authorization")))
        if self.fail_a2a and request.url.path != "/handoff":
            return httpx.Response(503, content=b"unavailable")
        return await self.inner.handle_async_request(request)

    async def aclose(self):
        await self.inner.aclose()


def margaret(body):
    body = dict(body, personId="margaret", lastKnownWellAt="2026-10-15T14:55:00Z",
                onScene={"name": "David", "relation": "son"})
    body["hospital"] = {"id": "sydney-stroke-center", "name": "Sydney Stroke Center (demo)", "etaMin": 9}
    return body


def test_live_a2a_ba_mai_returns_golden_packet(server_url, request_body, packet):
    out = run(hc.send_handoff(server_url, request_body, auth=False))
    assert out == {"status": "RECEIVED", "fallback": False, "packet": packet}


def test_live_a2a_margaret(server_url, request_body):
    out = run(hc.send_handoff(server_url, margaret(request_body), auth=False))
    assert out["status"] == "RECEIVED" and out["fallback"] is False
    assert out["packet"]["status"] == "COMPLETED"
    assert out["packet"]["patient"] == {"name": "Margaret Collins", "age": 78, "sex": "F"}


def test_live_invalid_request_is_failed_without_fallback(server_url, request_body, caplog):
    request_body["suspected"] = "FLU"
    proxy = Proxy()
    out = run(hc.send_handoff(server_url, request_body, auth=False, transport=proxy))
    assert out == {"status": "FAILED", "fallback": False}
    assert last_log(caplog)["errorCode"] == "INVALID_REQUEST"
    assert all(path != "/handoff" for _, path, _ in proxy.seen)


def test_live_a2a_failure_falls_back_to_http_with_same_packet(server_url, request_body, packet):
    proxy = Proxy(fail_a2a=True)
    out = run(hc.send_handoff(server_url, request_body, auth=False, transport=proxy))
    assert out == {"status": "RECEIVED", "fallback": True, "packet": packet}
    assert proxy.seen[-1][:2] == ("POST", "/handoff")


@pytest.mark.parametrize("fail_a2a", [False, True])
def test_live_every_request_carries_the_identity_token(server_url, request_body, fail_a2a):
    proxy = Proxy(fail_a2a=fail_a2a)
    out = run(hc.send_handoff(server_url, request_body, token_provider=lambda _: TOKEN, transport=proxy))
    assert out["status"] == "RECEIVED"
    paths = {(m, p) for m, p, _ in proxy.seen}
    assert ("GET", "/.well-known/agent-card.json") in paths
    assert ("POST", "/handoff" if fail_a2a else "/") in paths
    assert {auth for _, _, auth in proxy.seen} == {f"Bearer {TOKEN}"}
