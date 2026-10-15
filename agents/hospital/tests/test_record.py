from datetime import date

from handoff.fhir import FixtureReader
from handoff.record import normalize

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


PATIENT = {"resourceType": "Patient", "id": "p", "name": [{"text": "Test"}], "gender": "male"}


def test_ba_mai_bundle_normalizes(resources):
    rec = normalize(resources, "ba-mai", ON)
    assert (rec.name, rec.age, rec.sex) == ("Bà Mai", 78, "F")
    assert [c for c, _ in rec.conditions] == ["hearing loss", "hypertension"]
    assert [(m.name, m.dose) for m, _ in rec.medications] == [("amlodipine", "5 mg daily"), ("aspirin", "81 mg daily")]
    assert [a for a, _ in rec.allergies] == ["penicillin"]
    assert [c for c, _ in rec.communication] == ["HARD_OF_HEARING"]
    assert [f for f, _ in rec.family_history] == ["father: stroke at 68, hypertension"]
    assert len(rec.consents) == 1 and rec.warnings == []


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
    assert normalize(resources, "ba-mai", ON) == normalize(list(reversed(resources)), "ba-mai", ON)


async def _read(reader, pid):
    return await reader.read(pid)


def test_fixture_reader_returns_patient_compartment_and_empty_for_unknown(bundle):
    import asyncio
    reader = FixtureReader()
    assert len(asyncio.run(_read(reader, "ba-mai"))) == len(bundle["entry"])
    assert asyncio.run(_read(reader, "nobody")) == []
