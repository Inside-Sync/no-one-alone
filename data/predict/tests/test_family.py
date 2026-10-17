import copy

import pytest

from predict import family, sources

SEED = sources.load_seed()


def build(pid, resources=None, seed=None):
    return family.build_family(pid, resources if resources is not None else sources.load_bundle(pid), seed or SEED)


def by_id(doc):
    return {m["id"]: m for m in doc["members"]}


def flags(doc):
    return sorted((f["memberId"], f["screening"]) for f in doc["flags"])


def test_margaret_history_comes_from_fhir_and_relationships_from_the_seed():
    doc = build("margaret")["doc"]
    m = by_id(doc)
    assert m["margaret-father"]["conditions"] == [{"label": "stroke", "ageAtOnset": 74}, {"label": "type 2 diabetes"}]
    assert m["margaret-father"]["deceased"] is True
    assert m["margaret-mother"]["conditions"] == [{"label": "dementia"}]
    assert "deceased" not in m["margaret-mother"], "not recorded in FHIR, so omitted"
    assert m["david"]["relation"] == "brother" and m["david"]["generation"] == 1
    assert m["david"]["parentId"] == "margaret-father", "a brother shares Margaret's parents"
    assert {k for k, v in m.items() if v["generation"] == 2} == {"james", "sarah"}
    assert "aisha" not in m, "neighbours are not family"


def test_margaret_gets_no_invented_names_or_web_mock_conditions():
    doc = build("margaret")["doc"]
    m = by_id(doc)
    assert (m["margaret-father"]["name"], m["margaret-mother"]["name"]) == ("Father", "Mother")
    labels = {c["label"] for x in doc["members"] for c in x["conditions"]}
    for mock_only in ("glaucoma", "atrial fibrillation", "osteopenia"):
        assert not any(mock_only in label for label in labels)
    assert [x["id"] for x in doc["members"] if x["relation"] in ("brother", "husband")] == ["david"], "only seed relatives"
    assert all("68" not in f["reason"] for f in doc["flags"]), "Margaret's father had his stroke at 74 in FHIR"


def test_margaret_provisional_af_is_left_out_of_the_tree():
    self_labels = [c["label"] for c in by_id(build("margaret")["doc"])["margaret"]["conditions"]]
    assert "atrial fibrillation" not in " ".join(self_labels)
    assert "hypertension" in self_labels and "prediabetes" in self_labels


def test_margaret_children_and_brother_get_bp_and_sugar_flags_with_documented_reasons():
    doc = build("margaret")["doc"]
    assert flags(doc) == sorted((c, s) for c in ("david", "james", "sarah")
                                for s in (family.BP_CHECK, family.SUGAR_TEST))
    reasons = {(f["memberId"], f["screening"]): f["reason"] for f in doc["flags"]}
    assert reasons[("james", family.BP_CHECK)] == "Mother: hypertension; grandfather: stroke at 74"
    assert reasons[("james", family.SUGAR_TEST)] == "Mother: prediabetes; grandfather: type 2 diabetes"
    assert reasons[("david", family.BP_CHECK)] == "Father: stroke at 74"
    assert reasons[("david", family.SUGAR_TEST)] == "Father: type 2 diabetes"


def test_ba_mai_father_uses_the_contract_name_and_hung_has_no_invented_history():
    doc = build("ba-mai")["doc"]
    m = by_id(doc)
    assert (m["ong-tu"]["name"], m["ong-tu"]["relation"]) == ("Ông Tư", "father")
    assert m["ong-tu"]["conditions"] == [{"label": "stroke", "ageAtOnset": 68}, {"label": "hypertension"}]
    assert m["ong-hung"] == {"id": "ong-hung", "name": "Ông Hùng", "relation": "brother", "generation": 1,
                             "conditions": [], "parentId": "ong-tu"}
    assert m["ba-mai"]["parentId"] == "ong-tu"


def test_ba_mai_flags_lan_tuan_and_hung_for_blood_pressure_only():
    doc = build("ba-mai")["doc"]
    assert flags(doc) == [("lan", family.BP_CHECK), ("ong-hung", family.BP_CHECK), ("tuan", family.BP_CHECK)]
    reasons = {f["memberId"]: f["reason"] for f in doc["flags"]}
    assert reasons["lan"] == "Mother: hypertension; grandfather: stroke at 68, hypertension"
    assert reasons["ong-hung"] == "Father: stroke at 68, hypertension"


def test_missing_family_history_keeps_self_based_flags_and_no_parents():
    resources = [r for r in sources.load_bundle("ba-mai") if r["resourceType"] != "FamilyMemberHistory"]
    doc = build("ba-mai", resources)["doc"]
    assert {m["generation"] for m in doc["members"]} == {1, 2}
    assert "parentId" not in by_id(doc)["ong-hung"] and "parentId" not in by_id(doc)["ba-mai"]
    assert flags(doc) == [("lan", family.BP_CHECK), ("tuan", family.BP_CHECK)]
    assert all("grandfather" not in f["reason"] for f in doc["flags"])


def test_no_documented_history_gives_no_flags():
    resources = [r for r in sources.load_bundle("ba-mai") if r["resourceType"] not in ("FamilyMemberHistory", "Condition")]
    doc = build("ba-mai", resources)["doc"]
    assert doc["flags"] == []
    assert all(m["conditions"] == [] for m in doc["members"])


def test_unknown_relation_and_entered_in_error_history_are_skipped_not_guessed():
    resources = copy.deepcopy(sources.load_bundle("margaret"))
    for r in resources:
        if r["id"] == "margaret-mother":
            r["relationship"]["coding"][0]["code"] = "UNCLE"
        if r["id"] == "margaret-father":
            r["status"] = "entered-in-error"
    doc = build("margaret", resources)["doc"]
    assert [m["relation"] for m in doc["members"] if m["generation"] == 0] == []
    assert all("grandfather" not in f["reason"] for f in doc["flags"])


def test_inactive_and_unconfirmed_conditions_never_enter_the_tree():
    resources = copy.deepcopy(sources.load_bundle("ba-mai"))
    for r in resources:
        if r["id"] == "ba-mai-hypertension":
            r["verificationStatus"]["coding"][0]["code"] = "unconfirmed"
    doc = build("ba-mai", resources)["doc"]
    assert by_id(doc)["ba-mai"]["conditions"] == [{"label": "hearing loss"}]
    assert all("Mother: hypertension" not in f["reason"] for f in doc["flags"])


def test_output_is_deterministic_and_sources_list_only_used_resources():
    a, b = build("margaret"), build("margaret")
    assert a["doc"] == b["doc"]
    assert "Condition/margaret-af" not in a["sources"], "provisional AF is not used"
    assert "FamilyMemberHistory/margaret-father" in a["sources"]


def test_facts_behind_each_flag_are_documented_strings():
    out = build("margaret")
    assert out["facts"][("james", family.SUGAR_TEST)] == ["mother: prediabetes", "grandfather (deceased): type 2 diabetes"]


def test_only_relatives_recorded_as_deceased_are_marked():
    margaret = build("margaret")["facts"]
    assert margaret[("james", family.BP_CHECK)] == ["mother: hypertension", "grandfather (deceased): stroke at 74"]
    assert margaret[("david", family.BP_CHECK)] == ["father (deceased): stroke at 74"]
    hung = build("ba-mai")["facts"][("ong-hung", family.BP_CHECK)]
    assert hung == ["father (deceased): stroke at 68", "father (deceased): hypertension"]


def test_unknown_or_living_status_is_never_marked_deceased():
    resources = copy.deepcopy(sources.load_bundle("margaret"))
    for r in resources:
        if r["id"] == "margaret-father":
            del r["deceasedBoolean"]           # status not recorded
        if r["id"] == "margaret-mother":
            r["deceasedBoolean"] = False       # recorded as living
    out = build("margaret", resources)
    assert all("deceased" not in fact for facts in out["facts"].values() for fact in facts)
    assert all("deceased" not in m for m in out["doc"]["members"])


@pytest.mark.parametrize("field,value", [("deceasedAge", {"value": 80, "unit": "a"}), ("deceasedDate", "2010-05-01"),
                                         ("deceasedString", "died in 2010"), ("deceasedBoolean", True)])
def test_any_recorded_form_of_death_counts_as_deceased(field, value):
    resources = copy.deepcopy(sources.load_bundle("margaret"))
    for r in resources:
        if r["id"] == "margaret-mother":
            r[field] = value
    assert by_id(build("margaret", resources)["doc"])["margaret-mother"]["deceased"] is True


@pytest.mark.parametrize("pid", sources.PEOPLE)
def test_no_internal_fields_leak_into_the_document(pid):
    for m in build(pid)["doc"]["members"]:
        assert set(m) <= {"id", "name", "relation", "generation", "deceased", "parentId", "conditions"}
        for c in m["conditions"]:
            assert set(c) <= {"label", "ageAtOnset"}


@pytest.mark.parametrize("code,kind", [("230690007", family.STROKE), ("38341003", family.HTN),
                                       ("44054006", family.T2D), ("714628002", family.PREDIABETES)])
def test_snomed_code_alone_identifies_the_condition(code, kind):
    assert family._kind({"coding": [{"system": family.SNOMED, "code": code}], "text": "recorded by GP"}) == kind
