"""Normalizes FHIR R4 resources into the facts the packet can use, each with its source reference.

Rules that keep the packet honest:
- A condition that is not confirmed keeps a "(provisional)" suffix; refuted and entered-in-error are dropped.
- No AllergyIntolerance resource means allergies are unknown (None), never "no allergies".
- Only active conditions, medications and allergies are used.
"""
from dataclasses import dataclass, field
from datetime import date

from .contracts import Communication, Medication

SNOMED = "http://snomed.info/sct"
NO_KNOWN_ALLERGY = "716186003"
COMMUNICATION_BY_SNOMED: dict[str, Communication] = {
    "15188001": "HARD_OF_HEARING",       # Hearing loss
    "386806002": "COGNITIVE_IMPAIRMENT",  # Impaired cognition
}
STATED_AGE_URL = "https://noonealone.insidesync.ai/fhir/StructureDefinition/synthetic-stated-age"


@dataclass
class Record:
    patient_ref: str | None = None
    name: str | None = None
    sex: str | None = None
    age: int | None = None
    conditions: list[tuple[str, str]] = field(default_factory=list)            # (label, ref)
    communication: list[tuple[Communication, str]] = field(default_factory=list)
    medications: list[tuple[Medication, str]] = field(default_factory=list)
    allergies: list[tuple[str, str]] | None = None                             # None: nothing recorded
    family_history: list[tuple[str, str]] = field(default_factory=list)
    consents: list[dict] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def ref(r: dict) -> str:
    return f'{r["resourceType"]}/{r["id"]}'


def _code(cc: dict | None) -> str | None:
    coding = (cc or {}).get("coding") or []
    return coding[0].get("code") if coding else None


def _label(cc: dict | None) -> str | None:
    cc = cc or {}
    if cc.get("text"):
        return cc["text"]
    for c in cc.get("coding") or []:
        if c.get("display"):
            return c["display"]
    return None


def _snomed(cc: dict | None) -> set[str]:
    return {c["code"] for c in (cc or {}).get("coding") or [] if c.get("system") == SNOMED and c.get("code")}


def _age(patient: dict, on: date) -> int | None:
    if birth := patient.get("birthDate"):
        if len(birth) == 10:  # full date only; partial dates give no exact age
            b = date.fromisoformat(birth)
            return on.year - b.year - ((on.month, on.day) < (b.month, b.day))
        return None
    for ext in patient.get("extension") or []:
        if ext.get("url") == STATED_AGE_URL and isinstance((ext.get("valueAge") or {}).get("value"), int):
            return ext["valueAge"]["value"]
    return None


def normalize(resources: list[dict], person_id: str, on: date) -> Record:
    rec = Record()
    known_none = False
    allergies: list[tuple[str, str]] = []
    # Sorted by reference so the packet does not depend on the order the store returns resources in.
    for r in sorted(resources, key=ref):
        kind = r["resourceType"]
        if kind == "Patient" and r.get("id") == person_id:
            rec.patient_ref = ref(r)
            names = r.get("name") or []
            if names:
                n = names[0]
                rec.name = n.get("text") or " ".join([*n.get("given", []), n.get("family", "")]).strip() or None
            rec.sex = {"female": "F", "male": "M"}.get(r.get("gender"))
            rec.age = _age(r, on)
        elif kind == "Condition":
            if _code(r.get("clinicalStatus")) not in ("active", "recurrence", "relapse"):
                continue
            verification = _code(r.get("verificationStatus"))
            if verification in ("refuted", "entered-in-error"):
                continue
            label = _label(r.get("code"))
            if not label:
                rec.warnings.append("CONDITION_UNREADABLE")
                continue
            rec.conditions.append((label if verification == "confirmed" else f"{label} (provisional)", ref(r)))
            for code in sorted(_snomed(r.get("code"))):
                if code in COMMUNICATION_BY_SNOMED:
                    rec.communication.append((COMMUNICATION_BY_SNOMED[code], ref(r)))
        elif kind == "MedicationStatement":
            if r.get("status") != "active":
                continue
            name = _label(r.get("medicationCodeableConcept"))
            if not name:
                rec.warnings.append("MEDICATION_UNREADABLE")
                continue
            dose = ((r.get("dosage") or [{}])[0]).get("text")
            rec.medications.append((Medication(name=name, dose=dose), ref(r)))
        elif kind == "AllergyIntolerance":
            verification = _code(r.get("verificationStatus"))
            if verification in ("refuted", "entered-in-error"):
                continue
            if _code(r.get("clinicalStatus")) in ("inactive", "resolved"):
                continue
            if NO_KNOWN_ALLERGY in _snomed(r.get("code")):
                known_none = True
                continue
            label = _label(r.get("code"))
            if not label:
                rec.warnings.append("ALLERGY_UNREADABLE")
                continue
            allergies.append((label if verification in (None, "confirmed") else f"{label} (unconfirmed)", ref(r)))
        elif kind == "FamilyMemberHistory":
            if r.get("status") == "entered-in-error":
                continue
            who = _label(r.get("relationship")) or "relative"
            parts = []
            for c in r.get("condition") or []:
                label = _label(c.get("code"))
                if label:
                    onset = (c.get("onsetAge") or {}).get("value")
                    parts.append(f"{label} at {onset}" if onset is not None else label)
            if parts:
                rec.family_history.append((f"{who}: {', '.join(parts)}", ref(r)))
        elif kind == "Consent":
            rec.consents.append(r)
    # An empty list only when "no known allergy" is recorded; unreadable entries never mean "none".
    if allergies or known_none:
        rec.allergies = allergies
        if known_none and allergies:
            rec.warnings.append("ALLERGY_RECORD_CONFLICT")
    rec.warnings = sorted(set(rec.warnings))
    return rec
