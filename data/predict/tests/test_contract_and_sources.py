import copy

import pytest

from predict import family, sources
from predict.contract import check_family_doc


@pytest.mark.parametrize("pid", sources.PEOPLE)
def test_generated_documents_match_the_web_family_contract(pid):
    doc = family.build_family(pid, sources.load_bundle(pid), sources.load_seed())["doc"]
    assert check_family_doc(doc) == []


def valid():
    return {"members": [{"id": "a", "name": "A", "relation": "self", "generation": 1, "conditions": []},
                        {"id": "b", "name": "B", "relation": "son", "generation": 2, "parentId": "a",
                         "conditions": [{"label": "x", "ageAtOnset": 3}]}],
            "flags": [{"memberId": "b", "screening": "s", "reason": "r"}]}


@pytest.mark.parametrize("mutate,expect", [
    (lambda d: d["members"][1].update(deceased=None), "never null"),
    (lambda d: d["members"][1].update(nickname="x"), "not in the contract"),
    (lambda d: d["members"][1].update(parentId="zz"), "unknown member"),
    (lambda d: d["flags"][0].update(memberId="zz"), "unknown member"),
    (lambda d: d["members"][0].update(generation=True), "expected int"),
    (lambda d: d["members"][1]["conditions"][0].update(ageAtOnset="3"), "expected int"),
    (lambda d: d["members"][1].update(relation="self"), "exactly one"),
    (lambda d: d.update(updatedAt="x"), "keys must be"),
])
def test_contract_check_catches_shape_errors(mutate, expect):
    d = copy.deepcopy(valid())
    assert check_family_doc(d) == []
    mutate(d)
    assert any(expect in p for p in check_family_doc(d))


@pytest.mark.parametrize("pid", ["../ba-mai", "Ba-Mai", "ba_mai", "", "margaret/../x"])
def test_sources_reject_ids_that_are_not_kebab_case(pid):
    with pytest.raises(ValueError):
        sources.load_bundle(pid)


def test_sources_read_the_hospital_bundles_and_core_api_seed():
    assert any(r["resourceType"] == "Patient" and r["id"] == "margaret" for r in sources.load_bundle("margaret"))
    assert set(sources.PEOPLE) <= set(sources.load_seed()["people"])
