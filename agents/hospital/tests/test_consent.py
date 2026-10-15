from datetime import datetime, timezone

import pytest

from handoff.consent import SHARING_SYSTEM, decide
from handoff.contracts import CATEGORIES

NOW = datetime(2026, 10, 15, 19, 7, tzinfo=timezone.utc)


@pytest.fixture
def consent(resources):
    return next(r for r in resources if r["resourceType"] == "Consent")


def codes(*names):
    return [{"coding": [{"system": SHARING_SYSTEM, "code": n}]} for n in names]


def test_demo_consent_permits_all_six_categories(consent):
    d = decide([consent], "ba-mai", NOW)
    assert d.allowed == frozenset(CATEGORIES) and not d.blocked and d.withheld() == []
    assert d.refs == ("Consent/ba-mai-hospital-sharing",)


def test_missing_consent_blocks():
    d = decide([], "ba-mai", NOW)
    assert d.blocked and d.withheld() == list(CATEGORIES)


def test_restricted_consent_withholds_other_categories(consent):
    consent["provision"]["code"] = codes("identity", "allergies")
    d = decide([consent], "ba-mai", NOW)
    assert d.allowed == {"identity", "allergies"}
    assert d.withheld() == ["conditions", "medications", "familyHistory", "communication"]


def test_nested_deny_removes_category(consent):
    consent["provision"]["provision"] = [{"type": "deny", "code": codes("medications")}]
    assert "medications" not in decide([consent], "ba-mai", NOW).allowed


@pytest.mark.parametrize("period", [{"end": "2026-10-01T00:00:00Z"}, {"start": "2026-11-01T00:00:00Z"},
                                    {"end": "not a date"}, {"end": "2026-12-01T00:00:00"}])
def test_expired_future_or_unreadable_period_blocks(consent, period):
    consent["provision"]["period"] = period
    assert decide([consent], "ba-mai", NOW).blocked


def test_open_period_covering_now_allows(consent):
    consent["provision"]["period"] = {"start": "2026-08-14T00:00:00Z", "end": "2027-01-01T00:00:00Z"}
    assert not decide([consent], "ba-mai", NOW).blocked


@pytest.mark.parametrize("mutate", [
    lambda c: c.update(status="inactive"),
    lambda c: c.update(status="proposed"),
    lambda c: c.update(patient={"reference": "Patient/someone-else"}),
    lambda c: c["provision"].update(type="deny"),
    lambda c: c["provision"].update(purpose=[{"system": "http://terminology.hl7.org/CodeSystem/v3-ActReason", "code": "HRESCH"}]),
    lambda c: c["provision"].update(actor=[]),
    lambda c: c.update(scope={"coding": [{"system": "http://terminology.hl7.org/CodeSystem/consentscope", "code": "research"}]}),
    lambda c: c["provision"].update(code=[{"coding": [{"system": "https://other.example/system", "code": "identity"}]}]),
])
def test_anything_short_of_a_valid_consent_blocks(consent, mutate):
    mutate(consent)
    assert decide([consent], "ba-mai", NOW).blocked


def test_unknown_category_codes_are_ignored(consent):
    consent["provision"]["code"] = codes("identity", "everything")
    assert decide([consent], "ba-mai", NOW).allowed == {"identity"}
