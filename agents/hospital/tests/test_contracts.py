import pytest
from pydantic import ValidationError

from handoff.contracts import ErrorBody, HandoffPacket, HandoffRequest
from tests.conftest import ROOT, load_json


def test_contract_request_parses(request_body):
    req = HandoffRequest.model_validate(request_body)
    assert req.person_id == "ba-mai"
    assert req.hospital.eta_min == 14
    assert req.on_scene.name == "Ông Hùng"
    assert req.last_known_well_at == "2026-10-15T18:55:00Z"


@pytest.mark.parametrize("field", ["incidentId", "personId", "level", "suspected", "hospital"])
def test_missing_required_field_fails(request_body, field):
    del request_body[field]
    with pytest.raises(ValidationError):
        HandoffRequest.model_validate(request_body)


@pytest.mark.parametrize("field,value", [("suspected", "FLU"), ("level", "HIGH"), ("lastKnownWellAt", "2026-10-15T18:55:00+07:00"),
                                         ("lastKnownWellAt", "yesterday"), ("personId", "")])
def test_bad_value_fails(request_body, field, value):
    request_body[field] = value
    with pytest.raises(ValidationError):
        HandoffRequest.model_validate(request_body)


def test_optional_fields_may_be_absent(request_body):
    for k in ("lastKnownWellAt", "findings", "onScene"):
        del request_body[k]
    del request_body["hospital"]["etaMin"]
    req = HandoffRequest.model_validate(request_body)
    assert req.findings == [] and req.on_scene is None and req.hospital.eta_min is None


def test_unknown_fields_are_ignored(request_body):
    request_body["newCoreApiField"] = 1
    request_body["hospital"]["strokeReady"] = True
    HandoffRequest.model_validate(request_body)


def test_packet_omits_absent_fields_and_uses_camel_case():
    out = HandoffPacket(suspected="STROKE", findings=[], text="t", status="BLOCKED_CONSENT", eta_min=14).to_json()
    assert out == {"suspected": "STROKE", "findings": [], "etaMin": 14, "text": "t", "status": "BLOCKED_CONSENT",
                   "withheld": [], "warnings": [], "sources": []}


def test_packet_rejects_unknown_fields():
    with pytest.raises(ValidationError):
        HandoffPacket(suspected="STROKE", findings=[], text="t", status="COMPLETED", diagnosis="x")


def test_error_shape_matches_contract():
    assert ErrorBody.of("INVALID_REQUEST", "bad").to_json() == {"error": {"code": "INVALID_REQUEST", "message": "bad"}}


def test_bundle_is_synthetic_transaction_with_resolvable_references(bundle):
    assert bundle["type"] == "transaction"
    ids = set()
    for e in bundle["entry"]:
        r = e["resource"]
        ref = f'{r["resourceType"]}/{r["id"]}'
        assert e["request"] == {"method": "PUT", "url": ref}, "PUT with a fixed id keeps the load idempotent"
        assert {"code": "HTEST"}.items() <= r["meta"]["tag"][0].items()
        ids.add(ref)
    for e in bundle["entry"]:
        r = e["resource"]
        for key in ("subject", "patient"):
            if key in r:
                assert r[key]["reference"] in ids


def test_bundle_has_no_birth_date(resources):
    patient = next(r for r in resources if r["resourceType"] == "Patient")
    assert "birthDate" not in patient


@pytest.mark.parametrize("name", ["ba-mai", "margaret"])
def test_every_bundle_is_synthetic_with_resolvable_references(name):
    bundle = load_json(ROOT / "data" / "fhir" / f"{name}.json")
    assert bundle["type"] == "transaction"
    assert bundle["meta"]["tag"][0]["code"] == "HTEST"
    ids = set()
    for e in bundle["entry"]:
        r = e["resource"]
        ref = f'{r["resourceType"]}/{r["id"]}'
        assert e["request"] == {"method": "PUT", "url": ref}
        assert {"code": "HTEST"}.items() <= r["meta"]["tag"][0].items()
        assert r["resourceType"] != "Patient" or "birthDate" not in r
        ids.add(ref)
    for e in bundle["entry"]:
        r = e["resource"]
        for key in ("subject", "patient"):
            if key in r:
                assert r[key]["reference"] in ids
