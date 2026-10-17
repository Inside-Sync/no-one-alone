"""FHIR_SOURCE=live against an in-memory Cloud Healthcare store: same packets as fixtures, fail closed, no fallback."""
import asyncio
import copy
import importlib
import json
import logging
from datetime import datetime, timezone

import httpx
import pytest

from handoff import fhir, live, pipeline
from handoff.fhir import FixtureReader, RecordUnavailable
from handoff.live import HealthcareReader
from handoff.record import normalize
from tests.conftest import HERE, load_json
from tests.fake_store import BASE, STORE, TOKEN, FakeStore, bundle_resources

NOW = datetime(2026, 10, 15, 19, 7, tzinfo=timezone.utc)
PEOPLE = ("ba-mai", "margaret")
REQUESTS = {"ba-mai": "request.stroke.json", "margaret": "request.stroke.margaret.json"}
GOLDEN = {"ba-mai": "packet.stroke.json", "margaret": "packet.stroke.margaret.json"}
CALLS_PER_READ = 1 + len(live.SEARCHES)


def store_with(*people, **kw) -> FakeStore:
    return FakeStore([r for p in people for r in bundle_resources(p)], **kw)


def reader(store: FakeStore, **kw) -> HealthcareReader:
    return HealthcareReader(STORE, token_provider=lambda: TOKEN, transport=store.transport(), **kw)


def handle(person_id, rdr):
    return asyncio.run(pipeline.handle(load_json(HERE / "fixtures" / REQUESTS[person_id]), reader=rdr, now=NOW))


def strip_meta(resources):
    return sorted(({k: v for k, v in r.items() if k != "meta"} for r in resources), key=lambda r: (r["resourceType"], r["id"]))


@pytest.mark.parametrize("pid", PEOPLE)
def test_live_packet_matches_the_golden_packet(pid):
    status, out = handle(pid, reader(store_with(*PEOPLE)))
    assert status == 200 and out == load_json(HERE / "fixtures" / GOLDEN[pid])


@pytest.mark.parametrize("pid", PEOPLE)
def test_fixture_packet_matches_the_same_golden(pid):
    assert handle(pid, FixtureReader()) == (200, load_json(HERE / "fixtures" / GOLDEN[pid]))


@pytest.mark.parametrize("pid", PEOPLE)
@pytest.mark.parametrize("kw", [{}, {"shuffle": True}, {"page_size": 1}, {"page_size": 2, "shuffle": True}])
def test_live_and_fixture_reads_normalize_identically(pid, kw):
    got = asyncio.run(reader(store_with(*PEOPLE, **kw)).read(pid))
    want = asyncio.run(FixtureReader().read(pid))
    assert strip_meta(got) == strip_meta(want)
    assert all("versionId" in r["meta"] for r in got), "store meta is present and ignored"
    on = NOW.date()
    a, b = normalize(got, pid, on), normalize(want, pid, on)
    a.consents, b.consents = strip_meta(a.consents), strip_meta(b.consents)
    assert a == b


def test_reads_are_patient_scoped_and_include_consent():
    store = store_with(*PEOPLE)
    asyncio.run(reader(store).read("ba-mai"))
    urls = [httpx.URL(u) for _, u in store.calls]
    assert all(m == "GET" for m, _ in store.calls) and len(urls) == CALLS_PER_READ
    assert urls[0].path.endswith("/fhir/Patient/ba-mai")
    searched = {u.path.rsplit("/", 1)[-1]: u.params["patient"] for u in urls[1:]}
    assert searched == {k: "Patient/ba-mai" for k, _ in live.SEARCHES} and "Consent" in searched
    assert not any("$everything" in u.path for u in urls)


def test_resources_for_another_patient_are_dropped():
    store = store_with("ba-mai")
    other = next(r for r in bundle_resources("margaret") if r["resourceType"] == "Condition")
    real = store._search

    def leaky(kind, query):  # a store that wrongly returns another patient's Condition
        r = real(kind, query)
        if kind != "Condition":
            return r
        body = r.json()
        body["entry"].append({"resource": copy.deepcopy(other), "search": {"mode": "match"}})
        return httpx.Response(200, json=body)
    store._search = leaky
    got = asyncio.run(reader(store).read("ba-mai"))
    assert other["id"] not in {r["id"] for r in got} and len(got) == 8


def test_every_page_is_followed():
    store = store_with("margaret", page_size=1)
    got = asyncio.run(reader(store).read("margaret"))
    assert len(got) == 14 and len(store.calls) > CALLS_PER_READ


@pytest.mark.parametrize("link", ["https://evil.example/v1/" + STORE + "/fhir/Condition?p=1",
                                  "http://healthcare.googleapis.com/v1/" + STORE + "/fhir/Condition?p=1",
                                  "https://healthcare.googleapis.com/v1/projects/other/locations/x/datasets/d/fhirStores/s/fhir/Condition"])
def test_a_paging_link_outside_the_store_is_refused(link):
    store = store_with("margaret", page_size=1)
    store.next_link = link
    with pytest.raises(RecordUnavailable, match="outside the store"):
        asyncio.run(reader(store).read("margaret"))
    assert not any("evil" in u or u.startswith("http://") for _, u in store.calls)


def test_endless_paging_stops_at_the_page_cap():
    store = store_with("ba-mai")
    store.endless = True
    with pytest.raises(RecordUnavailable, match="too many"):
        asyncio.run(reader(store).read("ba-mai"))


class NoFixtures(FixtureReader):
    async def read(self, person_id):
        raise AssertionError("live mode read the bundled fixtures")


@pytest.mark.parametrize("where", ["Patient", *[k for k, _ in live.SEARCHES]])
@pytest.mark.parametrize("failure", [401, 403, 429, 500, 503, "json", "shape", httpx.ConnectError("down"), httpx.ReadTimeout("slow")])
def test_any_failed_call_gives_record_unavailable_with_no_record_data(where, failure, monkeypatch, caplog):
    monkeypatch.setattr(fhir, "FixtureReader", NoFixtures)
    store = store_with(*PEOPLE)
    store.fail[where] = failure
    caplog.set_level(logging.INFO, logger="hospital_agent")
    status, out = handle("ba-mai", reader(store))
    assert status == 200 and out["status"] == "PARTIAL" and out["warnings"] == ["RECORD_UNAVAILABLE"]
    for key in ("patient", "conditions", "medications", "allergies", "familyHistory", "communication", "baseline"):
        assert key not in out
    assert out["sources"] == []
    blob = json.dumps(out, ensure_ascii=False) + caplog.text
    for value in ("penicillin", "amlodipine", "hypertension", "Bà Mai", TOKEN):
        assert value not in blob


def test_failed_consent_search_never_yields_a_packet_with_record_data():
    store = store_with("ba-mai")
    store.fail["Consent"] = 500
    _, out = handle("ba-mai", reader(store))
    assert out["status"] == "PARTIAL" and "conditions" not in out and out["withheld"] == []


def test_credentials_failure_is_record_unavailable():
    def no_creds():
        raise RuntimeError("no ADC")
    store = store_with("ba-mai")
    rdr = HealthcareReader(STORE, token_provider=no_creds, transport=store.transport())
    with pytest.raises(RecordUnavailable, match="credentials"):
        asyncio.run(rdr.read("ba-mai"))
    assert store.calls == []


def test_slow_store_hits_the_deadline():
    async def slow(request):
        await asyncio.sleep(1)
        return httpx.Response(200, json={})
    rdr = HealthcareReader(STORE, token_provider=lambda: TOKEN, transport=httpx.MockTransport(slow), deadline=0.05)
    with pytest.raises(RecordUnavailable, match="timeout"):
        asyncio.run(rdr.read("ba-mai"))


def test_search_outcome_error_and_wrong_types_fail_closed():
    store = store_with("ba-mai")
    real = store._search

    def outcome(kind, query):
        r = real(kind, query)
        if kind == "Condition":
            body = r.json()
            body["entry"].append({"search": {"mode": "outcome"}, "resource": {
                "resourceType": "OperationOutcome", "issue": [{"severity": "error", "code": "processing"}]}})
            return httpx.Response(200, json=body)
        return r
    store._search = outcome
    with pytest.raises(RecordUnavailable, match="outcome"):
        asyncio.run(reader(store).read("ba-mai"))


def test_log_line_names_the_error_without_patient_data(caplog):
    store = store_with("ba-mai")
    store.fail["Consent"] = 403
    caplog.set_level(logging.INFO, logger="hospital_agent")
    handle("ba-mai", reader(store))
    lines = [json.loads(r.getMessage()) for r in caplog.records]
    assert {"stage": "fhir", "source": "live", "error": "live: HTTP 403"} in lines
    assert "ba-mai" not in caplog.text and TOKEN not in caplog.text


def test_live_without_consent_is_blocked():
    store = FakeStore([r for r in bundle_resources("ba-mai") if r["resourceType"] != "Consent"])
    _, out = handle("ba-mai", reader(store))
    assert out["status"] == "BLOCKED_CONSENT" and "conditions" not in out and len(out["withheld"]) == 6


@pytest.mark.parametrize("change", [
    lambda c: c["provision"].update(period={"start": "2025-01-01T00:00:00Z", "end": "2026-01-01T00:00:00Z"}),
    lambda c: c["provision"].update(type="deny"),
    lambda c: c.update(status="inactive"),
    lambda c: c["provision"].update(period={"start": "not a date"}),
])
def test_live_expired_denied_or_malformed_consent_is_blocked(change):
    resources = bundle_resources("ba-mai")
    change(next(r for r in resources if r["resourceType"] == "Consent"))
    _, out = handle("ba-mai", reader(FakeStore(resources)))
    assert out["status"] == "BLOCKED_CONSENT" and "medications" not in out


def test_live_unknown_patient_is_patient_not_found():
    _, out = handle("ba-mai", reader(FakeStore()))
    assert out["status"] == "PARTIAL" and out["warnings"] == ["PATIENT_NOT_FOUND"]


@pytest.mark.parametrize("pid", ["Margaret", "../ba-mai", "", "ba_mai"])
def test_ids_that_are_not_kebab_case_make_no_call(pid):
    store = store_with("ba-mai")
    assert asyncio.run(reader(store).read(pid)) == [] and store.calls == []


def test_default_source_is_fixture(monkeypatch):
    monkeypatch.delenv("FHIR_SOURCE", raising=False)
    assert isinstance(fhir.default_reader(), FixtureReader)


def test_live_source_builds_the_live_reader(monkeypatch):
    monkeypatch.setenv("FHIR_SOURCE", "live")
    monkeypatch.setenv("FHIR_STORE", STORE)
    r = fhir.default_reader()
    assert isinstance(r, HealthcareReader) and r.base == BASE


@pytest.mark.parametrize("env", [
    {"FHIR_SOURCE": "live"},
    {"FHIR_SOURCE": "live", "FHIR_STORE": "records"},
    {"FHIR_SOURCE": "live", "FHIR_STORE": STORE + "/fhir"},
    {"FHIR_SOURCE": "live", "FHIR_STORE": STORE, "FHIR_API_BASE": "http://healthcare.example/v1"},
    {"FHIR_SOURCE": "Live"},
    {"FHIR_SOURCE": "firestore"},
])
def test_bad_configuration_fails_at_configure(monkeypatch, env):
    monkeypatch.delenv("FHIR_STORE", raising=False)
    for k, v in env.items():
        monkeypatch.setenv(k, v)
    with pytest.raises(RuntimeError):
        pipeline.configure()


def test_importing_main_in_live_mode_makes_no_network_call(monkeypatch):
    def no_network(*a, **k):
        raise AssertionError("network call at import")
    monkeypatch.setenv("FHIR_SOURCE", "live")
    monkeypatch.setenv("FHIR_STORE", STORE)
    monkeypatch.setattr(httpx.AsyncClient, "send", no_network)
    monkeypatch.setattr(live.AdcTokens, "__call__", no_network)
    import main
    try:
        importlib.reload(main)
        assert isinstance(pipeline._reader, HealthcareReader)
    finally:
        monkeypatch.delenv("FHIR_SOURCE")
        importlib.reload(main)
    assert isinstance(pipeline._reader, FixtureReader)


def test_main_refuses_to_start_with_a_bad_live_configuration(monkeypatch):
    monkeypatch.setenv("FHIR_SOURCE", "live")
    monkeypatch.delenv("FHIR_STORE", raising=False)
    import main
    try:
        with pytest.raises(RuntimeError, match="FHIR_STORE"):
            importlib.reload(main)
    finally:
        monkeypatch.delenv("FHIR_SOURCE")
        importlib.reload(main)
