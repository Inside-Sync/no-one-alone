"""Deterministic, fail-closed hospital-sharing consent.

A Consent authorizes sharing with the receiving emergency department only if all of these hold:
status active, patient is this person, scope patient-privacy, provision.type permit, purpose ETREAT,
an actor with role IRCP (information recipient), and now inside provision.period when one is set.
The categories it permits are its provision.code values on our hospital-sharing code system, minus
codes in nested deny provisions. No valid Consent means nothing from the record is shared.
There is no emergency override: that would be a team policy decision (docs/contract-extensions.md).
"""
from dataclasses import dataclass
from datetime import datetime

from .contracts import CATEGORIES, Category

SHARING_SYSTEM = "https://noonealone.insidesync.ai/fhir/CodeSystem/hospital-sharing"
SCOPE_SYSTEM = "http://terminology.hl7.org/CodeSystem/consentscope"
ACT_REASON = "http://terminology.hl7.org/CodeSystem/v3-ActReason"
PARTICIPATION = "http://terminology.hl7.org/CodeSystem/v3-ParticipationType"


@dataclass(frozen=True)
class ConsentDecision:
    allowed: frozenset[Category]
    refs: tuple[str, ...]  # Consents that granted something

    @property
    def blocked(self) -> bool:
        return not self.allowed

    def withheld(self) -> list[Category]:
        return [c for c in CATEGORIES if c not in self.allowed]


def _has(codings: list[dict] | None, system: str, code: str) -> bool:
    return any(c.get("system") == system and c.get("code") == code for c in codings or [])


def _codes(provision: dict) -> set[str]:
    return {c["code"] for cc in provision.get("code") or [] for c in cc.get("coding") or []
            if c.get("system") == SHARING_SYSTEM and c.get("code") in CATEGORIES}


def _in_period(period: dict | None, now: datetime) -> bool:
    if not period:
        return True
    try:
        start = period.get("start") and datetime.fromisoformat(period["start"])
        end = period.get("end") and datetime.fromisoformat(period["end"])
    except ValueError:
        return False  # an unreadable period never grants access
    for bound in (start, end):
        if bound and bound.tzinfo is None:
            return False
    return (not start or start <= now) and (not end or now < end)


def _grants(consent: dict, person_id: str, now: datetime) -> set[str]:
    p = consent.get("provision") or {}
    if not (consent.get("status") == "active"
            and (consent.get("patient") or {}).get("reference") == f"Patient/{person_id}"
            and _has((consent.get("scope") or {}).get("coding"), SCOPE_SYSTEM, "patient-privacy")
            and p.get("type") == "permit"
            and _has(p.get("purpose"), ACT_REASON, "ETREAT")
            and any(_has((a.get("role") or {}).get("coding"), PARTICIPATION, "IRCP") for a in p.get("actor") or [])
            and _in_period(p.get("period"), now)):
        return set()
    denied = set().union(*(_codes(n) for n in p.get("provision") or [] if n.get("type") == "deny"))
    return _codes(p) - denied


def decide(consents: list[dict], person_id: str, now: datetime) -> ConsentDecision:
    allowed: set[str] = set()
    refs = []
    for c in sorted(consents, key=lambda c: c.get("id", "")):
        granted = _grants(c, person_id, now)
        if granted:
            allowed |= granted
            refs.append(f'Consent/{c["id"]}')
    return ConsentDecision(allowed=frozenset(allowed), refs=tuple(refs))
