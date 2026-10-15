"""End-to-end pipeline over the synthetic bundle: golden packet, consent outcomes, failure modes, no leaks."""
import asyncio
import json
import logging
from datetime import datetime, timezone

import pytest

from handoff import pipeline
from handoff.consent import SHARING_SYSTEM
from handoff.fhir import RecordUnavailable
from tests.conftest import HERE, load_json

NOW = datetime(2026, 10, 15, 19, 7, tzinfo=timezone.utc)
# Every value that only the FHIR record knows. None may appear when its category is withheld.
RECORD_VALUES = {
    "identity": ["Bà Mai", "Lives alone"],
    "conditions": ["hypertension", "hearing loss"],
    "medications": ["amlodipine", "aspirin", "81 mg"],
    "allergies": ["penicillin"],
    "familyHistory": ["father", "stroke at 68"],
    "communication": ["HARD_OF_HEARING", "hard of hearing"],
}


class ListReader:
    def __init__(self, resources):
        self.resources = resources

    async def read(self, person_id):
        return self.resources


class FailingReader:
    async def read(self, person_id):
        raise RecordUnavailable("store down")


def handle(body, resources=None, reader=None):
    return asyncio.run(pipeline.handle(body, reader=reader or ListReader(resources), now=NOW))


def consent_of(resources):
    return next(r for r in resources if r["resourceType"] == "Consent")


def assert_absent(out, categories, caplog=None):
    blob = json.dumps(out, ensure_ascii=False)
    logs = caplog.text if caplog else ""
    for c in categories:
        for v in RECORD_VALUES[c]:
            if c == "conditions" and v == "hypertension" and "familyHistory" not in categories:
                continue  # also in the father's history, which is shared
            assert v not in blob, f"{c} value {v!r} leaked into the packet"
            assert v not in logs, f"{c} value {v!r} leaked into the logs"


def test_golden_stroke_packet(request_body, resources):
    status, out = handle(request_body, resources)
    assert status == 200
    assert out == load_json(HERE / "fixtures" / "packet.stroke.json")


def test_required_contract_fields_match_contract_example(request_body, resources):
    _, out = handle(request_body, resources)
    assert out["patient"] == {"name": "Bà Mai", "age": 78, "sex": "F"}
    assert sorted(out["conditions"]) == sorted(["hypertension", "hearing loss"])
    assert out["medications"] == [{"name": "amlodipine", "dose": "5 mg daily"}, {"name": "aspirin", "dose": "81 mg daily"}]
    assert out["allergies"] == ["penicillin"] and out["communication"] == ["HARD_OF_HEARING"]
    assert out["contact"] == {"name": "Ông Hùng", "relation": "brother", "onScene": True}
    assert out["etaMin"] == 14 and out["baseline"] == "Lives alone, independent"
    assert out["text"].startswith("PRE-ARRIVAL · ETA 14 min\nBà Mai, 78, F\n")


def test_text_keeps_prototype_row_order(request_body, resources):
    _, out = handle(request_body, resources)
    labels = [line.split(":")[0] for line in out["text"].splitlines()[2:-1]]
    assert labels == ["Tình trạng (Status)", "Bình thường lần cuối (Last well)", "Dấu hiệu (Findings)", "Bệnh sử (History)",
                      "Thuốc (Medicines)", "Dị ứng (Allergy)", "Chức năng (Function)", "Giao tiếp (Comms)", "Người nhà (Contact)"]
    assert out["text"].endswith("SYNTHETIC DEMO DATA")


def test_missing_consent_blocks_all_record_data(request_body, resources, caplog):
    caplog.set_level(logging.INFO, "hospital_agent")
    _, out = handle(request_body, [r for r in resources if r["resourceType"] != "Consent"])
    assert out["status"] == "BLOCKED_CONSENT"
    assert out["withheld"] == ["identity", "conditions", "medications", "allergies", "familyHistory", "communication"]
    assert out["sources"] == [] and out["warnings"] == []
    for key in ("patient", "conditions", "medications", "allergies", "communication", "baseline", "familyHistory"):
        assert key not in out
    # Emergency facts from the request are still there.
    assert out["suspected"] == "STROKE" and out["findings"] == ["slurred speech 02:04", "HR 142"] and out["etaMin"] == 14
    assert_absent(out, RECORD_VALUES, caplog)
    assert "Bệnh nhân (patient): không chia sẻ" in out["text"]


def test_expired_consent_blocks(request_body, resources):
    consent_of(resources)["provision"]["period"] = {"end": "2026-10-01T00:00:00Z"}
    _, out = handle(request_body, resources)
    assert out["status"] == "BLOCKED_CONSENT"
    assert_absent(out, RECORD_VALUES)


def test_restricted_consent_withholds_only_denied_categories(request_body, resources, caplog):
    caplog.set_level(logging.INFO, "hospital_agent")
    consent_of(resources)["provision"]["code"] = [{"coding": [{"system": SHARING_SYSTEM, "code": c}]}
                                                  for c in ("identity", "allergies", "conditions")]
    _, out = handle(request_body, resources)
    assert out["status"] == "COMPLETED"
    assert out["withheld"] == ["medications", "familyHistory", "communication"]
    assert out["allergies"] == ["penicillin"] and "medications" not in out and "communication" not in out
    assert not any(s.startswith(("MedicationStatement", "FamilyMemberHistory")) for s in out["sources"])
    assert "Thuốc (Medicines): không chia sẻ" in out["text"]
    assert_absent(out, ["medications", "familyHistory", "communication"], caplog)


def test_missing_allergy_record_is_flagged_not_reported_as_none(request_body, resources):
    _, out = handle(request_body, [r for r in resources if r["resourceType"] != "AllergyIntolerance"])
    assert "allergies" not in out and "ALLERGIES_NOT_RECORDED" in out["warnings"]
    assert "Dị ứng (Allergy): chưa ghi nhận, cần hỏi (not recorded, ask)" in out["text"]


def test_record_unavailable_is_partial_with_request_facts_only(request_body):
    status, out = handle(request_body, reader=FailingReader())
    assert status == 200 and out["status"] == "PARTIAL" and out["warnings"] == ["RECORD_UNAVAILABLE"]
    assert out["withheld"] == [] and out["sources"] == [] and "patient" not in out
    assert "record unavailable" in out["text"]


def test_unknown_patient_is_partial(request_body):
    _, out = handle(request_body, [])
    assert out["status"] == "PARTIAL" and out["warnings"] == ["PATIENT_NOT_FOUND"]
    assert "record not found" in out["text"] and "record unavailable" not in out["text"]


def test_missing_eta_and_last_known_well_are_unknown_not_invented(request_body, resources):
    del request_body["hospital"]["etaMin"], request_body["lastKnownWellAt"]
    _, out = handle(request_body, resources)
    assert "etaMin" not in out and "lastKnownWellAt" not in out
    assert {"ETA_UNKNOWN", "LAST_KNOWN_WELL_UNKNOWN"} <= set(out["warnings"])
    assert out["text"].startswith("PRE-ARRIVAL · ETA unknown")


def test_same_input_gives_identical_output(request_body, resources):
    assert handle(request_body, resources) == handle(request_body, list(reversed(resources)))


def test_invalid_request_is_contract_error(resources):
    status, out = handle({"personId": "ba-mai"}, resources)
    assert status == 400 and out["error"]["code"] == "INVALID_REQUEST"


def test_unexpected_failure_is_agent_failed_without_details(request_body, caplog):
    class Broken:
        async def read(self, person_id):
            raise KeyError("Bà Mai")
    status, out = handle(request_body, reader=Broken())
    assert status == 502 and out == {"error": {"code": "AGENT_FAILED", "message": "hospital-agent could not build the packet"}}
    assert "Bà Mai" not in caplog.text


def test_completed_log_line_has_no_patient_data(request_body, resources, caplog):
    caplog.set_level(logging.INFO, "hospital_agent")
    handle(request_body, resources)
    line = json.loads(caplog.records[-1].getMessage())
    assert line["incidentId"] == "alert-123" and line["status"] == "COMPLETED"
    assert_absent({}, RECORD_VALUES, caplog)
    assert "Ông Hùng" not in caplog.text and "slurred" not in caplog.text


def _margaret_request(request_body):
    body = dict(request_body, personId="margaret", lastKnownWellAt="2026-10-15T14:55:00Z",
                onScene={"name": "David", "relation": "son"})
    body["hospital"] = {"id": "sydney-stroke-center", "name": "Sydney Stroke Center (demo)", "etaMin": 9}
    return body


def test_margaret_packet_is_english_in_sydney_time(request_body):
    from handoff.fhir import FixtureReader
    resources = asyncio.run(FixtureReader().read("margaret"))
    _, out = handle(_margaret_request(request_body), resources)
    assert out["status"] == "COMPLETED"
    assert out["patient"] == {"name": "Margaret Collins", "age": 78, "sex": "F"}
    assert "penicillin" in out["allergies"] and "HARD_OF_HEARING" in out["communication"]
    assert out["baseline"] == "Lives alone, independent, walking stick outdoors"
    text = out["text"]
    assert text.startswith("PRE-ARRIVAL · ETA 9 min\nMargaret Collins, 78, F")
    assert "Last well: 01:55 16/10 (AEDT)" in text
    assert "Status: suspected stroke" in text
    assert text.endswith("SYNTHETIC DEMO DATA")
    assert not any(ch in text for ch in "ạảấầậếềệịọốồộờớợụủứừựỳ")


def test_person_without_profile_uses_default_labels(request_body, resources):
    _, out = handle(dict(request_body, personId="new-person"), resources)
    assert "Tình trạng (Status)" in out["text"] and "(UTC+7)" in out["text"]
