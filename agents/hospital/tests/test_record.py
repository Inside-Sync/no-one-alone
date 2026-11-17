from datetime import date

import pytest

from handoff.fhir import FixtureReader, RecordUnavailable
from handoff.record import normalize
from tests.conftest import ROOT

ON = date(2026, 10, 15)


def cond(id_, text, verification="confirmed", clinical="active", snomed=None):
    code = {"text": text}
    if snomed:
        code["coding"] = [{"system": "http://snomed.info/sct", "code": snomed}]
    return {"resourceType": "Condition", "id": id_, "subject": {"reference": "Patient/p"}, "code": code,
            "clinicalStatus": {"coding": [{"code": clinical}]}, "verificationStatus": {"coding": [{"code": verification}]}}


def allergy(id_, text=None, snomed=None, verification="confirmed"):
    code = {"text": text} if text else {}
    if snomed:
        code["coding"] = [{"system": "http://snomed.info/sct", "code": snomed}]
    return {"resourceType": "AllergyIntolerance", "id": id_, "patient": {"reference": "Patient/p"}, "code": code,
            "verificationStatus": {"coding": [{"code": verification}]}}


def fam(id_, code, who, condition):
    return {"resourceType": "FamilyMemberHistory", "id": id_, "patient": {"reference": "Patient/p"},
            "relationship": {"coding": [{"code": code}], "text": who}, "condition": [{"code": {"text": condition}}]}


PATIENT = {"resourceType": "Patient", "id": "p", "name": [{"text": "Test"}], "gender": "male"}


def test_moza_bundle_normalizes(resources):
    rec = normalize(resources, "margaret", ON)
    assert (rec.name, rec.age, rec.sex) == ("Moza Al Hammadi", 78, "F")
    assert [c for c, _ in rec.conditions] == ["chronic kidney disease stage 3a", "hearing loss", "hypertension",
                                              "osteoarthritis of both knees", "prediabetes"]
    assert [(m.name, m.dose) for m, _ in rec.medications] == [
        ("amlodipine", "5 mg each evening"), ("aspirin", "100 mg each morning"),
        ("atorvastatin", "20 mg each night"), ("vitamin D3", "1000 IU daily")]
    assert [a for a, _ in rec.allergies] == ["penicillin"]
    assert [c for c, _ in rec.communication] == ["HARD_OF_HEARING"]
    assert [f for f, _ in rec.family_history] == [
        "brother: hypertension at 52, stroke at 69", "father: hypertension at 55, stroke at 68",
        "mother: glaucoma at 60, hearing loss at 74, dementia at 77", "son: hypertension"]
    assert len(rec.consents) == 1 and rec.warnings == []


def test_family_history_lists_blood_relatives_only():
    rec = normalize([PATIENT, fam("h", "HUSB", "husband", "atrial fibrillation"), fam("f", "FTH", "father", "stroke"),
                     fam("w", "WIFE", "wife", "diabetes")], "p", ON)
    assert rec.family_history == [("father: stroke", "FamilyMemberHistory/f")]


def test_provisional_condition_stays_provisional():
    rec = normalize([PATIENT, cond("af", "atrial fibrillation", "provisional")], "p", ON)
    assert rec.conditions == [("atrial fibrillation (provisional)", "Condition/af")]


def test_refuted_entered_in_error_and_resolved_conditions_are_dropped():
    rec = normalize([PATIENT, cond("a", "x", "refuted"), cond("b", "y", "entered-in-error"), cond("c", "z", clinical="resolved")], "p", ON)
    assert rec.conditions == []


def test_no_allergy_resource_means_unknown_not_none():
    assert normalize([PATIENT], "p", ON).allergies is None


def test_recorded_no_known_allergy_is_empty_list():
    assert normalize([PATIENT, allergy("nka", snomed="716186003")], "p", ON).allergies == []


def test_unreadable_allergy_is_not_treated_as_none():
    rec = normalize([PATIENT, allergy("x")], "p", ON)
    assert rec.allergies is None and rec.warnings == ["ALLERGY_UNREADABLE"]


def test_refuted_allergy_is_ignored_and_unconfirmed_is_marked():
    rec = normalize([PATIENT, allergy("a", "latex", verification="refuted"), allergy("b", "iodine", verification="unconfirmed")], "p", ON)
    assert rec.allergies == [("iodine (unconfirmed)", "AllergyIntolerance/b")]


def test_age_from_full_birth_date_only():
    assert normalize([{**PATIENT, "birthDate": "1948-10-16"}], "p", ON).age == 77
    assert normalize([{**PATIENT, "birthDate": "1948"}], "p", ON).age is None
    assert normalize([PATIENT], "p", ON).age is None


def test_output_does_not_depend_on_resource_order(resources):
    assert normalize(resources, "margaret", ON) == normalize(list(reversed(resources)), "margaret", ON)


async def _read(reader, pid):
    return await reader.read(pid)


def test_fixture_reader_returns_patient_compartment_and_empty_for_unknown(bundle):
    import asyncio
    reader = FixtureReader()
    assert len(asyncio.run(_read(reader, "margaret"))) == len(bundle["entry"])
    assert asyncio.run(_read(reader, "nobody")) == []


def test_fixture_reader_never_reads_outside_the_data_dir(tmp_path):
    import asyncio, json
    (tmp_path / "data").mkdir()
    outside = tmp_path / "outside.json"
    outside.write_text(json.dumps({"entry": [{"resource": {"resourceType": "Patient", "id": "../outside"}}]}),
                       encoding="utf-8")
    assert asyncio.run(_read(FixtureReader(tmp_path / "data"), "../outside")) == []


@pytest.mark.parametrize("pid", ["moza_x", "Moza-X", "..", ""])
def test_fixture_reader_rejects_ids_that_are_not_kebab_case(pid, tmp_path):
    import asyncio, json
    for stem in ("moza_x", "Moza-X"):
        bundle = {"entry": [{"resource": {"resourceType": "Patient", "id": stem}}]}
        (tmp_path / f"{stem}.json").write_text(json.dumps(bundle), encoding="utf-8")
    assert asyncio.run(_read(FixtureReader(tmp_path), pid)) == []


def test_fixture_reader_unreadable_file_is_record_unavailable(tmp_path):
    import asyncio
    (tmp_path / "margaret.json").write_text("{not json", encoding="utf-8")
    with pytest.raises(RecordUnavailable):
        asyncio.run(_read(FixtureReader(tmp_path), "margaret"))


def test_bundles_live_inside_the_service_dir():
    from handoff.fhir import DEFAULT_DIR
    assert DEFAULT_DIR.resolve().is_relative_to(ROOT.resolve())
    assert (DEFAULT_DIR / "margaret.json").is_file()
    lines = (ROOT / ".dockerignore").read_text(encoding="utf-8").splitlines()
    assert "data" not in [ln.strip().strip("/*") for ln in lines if not ln.lstrip().startswith("#")]
