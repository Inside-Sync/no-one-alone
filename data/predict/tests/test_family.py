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


def test_margaret_tree_is_the_design_member_by_member():
    doc = build("margaret")["doc"]
    assert [(m["id"], m["name"], m["relation"], m["generation"], m.get("parentId")) for m in doc["members"]] == [
        ("margaret-father", "Saeed Al Hammadi", "father", 0, None),
        ("margaret-mother", "Shamsa Al Hammadi", "mother", 0, None),
        ("margaret", "Moza Al Hammadi", "self", 1, "margaret-father"),
        ("margaret-husband", "Saif Al Mansoori", "husband", 1, None),
        ("david", "Hamad Al Hammadi", "brother", 1, "margaret-father"),
        ("sarah", "Alia Al Mansoori", "daughter", 2, "margaret"),
        ("james", "Khalid Al Mansoori", "son", 2, "margaret"),
        ("margaret-granddaughter", "Hessa Al Mansoori", "granddaughter", 3, "james"),
        ("margaret-grandson", "Zayed Al Mansoori", "grandson", 3, "james")]
    m = by_id(doc)
    assert {k: (v.get("age"), v.get("deceasedAge"), v.get("place"), v.get("deceased")) for k, v in m.items()} == {
        "margaret-father": (None, 72, None, True), "margaret-mother": (None, 80, None, True),
        "margaret": (78, None, "Al Bateen", None), "margaret-husband": (None, 75, None, True),
        "david": (74, None, "Al Bateen", None), "sarah": (49, None, "London", None), "james": (46, None, "Al Ain", None),
        "margaret-granddaughter": (19, None, "Al Ain", None), "margaret-grandson": (16, None, "Al Ain", None)}
    assert "aisha" not in m, "neighbours are not family"


def test_conditions_carry_onset_ages_codes_and_notes():
    m = by_id(build("margaret")["doc"])
    assert m["margaret-father"]["conditions"] == [{"label": "hypertension", "ageAtOnset": 55, "code": "HYPERTENSION"},
                                                  {"label": "stroke", "ageAtOnset": 68, "code": "STROKE"}]
    assert [(c["label"], c["ageAtOnset"]) for c in m["margaret-mother"]["conditions"]] == [
        ("glaucoma", 60), ("hearing loss", 74), ("dementia", 77)]
    assert [c["code"] for c in m["margaret-husband"]["conditions"]] == ["HYPERTENSION", "TYPE_2_DIABETES", "ATRIAL_FIBRILLATION"]
    assert m["david"]["conditions"] == [{"label": "hypertension", "ageAtOnset": 52, "code": "HYPERTENSION"},
                                        {"label": "stroke", "ageAtOnset": 69, "code": "STROKE"}]
    assert m["james"]["conditions"] == [{"label": "hypertension", "code": "HYPERTENSION", "note": "138/86"}]
    assert m["sarah"]["conditions"] == [] and m["margaret-grandson"]["conditions"] == []
    own = {c["label"]: c.get("ageAtOnset") for c in m["margaret"]["conditions"]}
    assert own["hypertension"] == 61 and own["hearing loss"] == 72 and own["prediabetes"] is None


def test_margaret_provisional_af_is_left_out_of_her_own_conditions():
    self_labels = [c["label"] for c in by_id(build("margaret")["doc"])["margaret"]["conditions"]]
    assert "atrial fibrillation" not in " ".join(self_labels)
    assert "hypertension" in self_labels and "prediabetes" in self_labels


def test_children_and_brother_get_flags_with_documented_reasons():
    doc = build("margaret")["doc"]
    assert flags(doc) == sorted([("david", family.BP_CHECK)] + [(c, s) for c in ("james", "sarah")
                                                                  for s in (family.BP_CHECK, family.SUGAR_TEST)])
    reasons = {(f["memberId"], f["screening"]): f["reason"] for f in doc["flags"]}
    bp = "Mother: hypertension at 61; father: hypertension at 60; grandfather: hypertension at 55, stroke at 68"
    assert reasons[("james", family.BP_CHECK)] == reasons[("sarah", family.BP_CHECK)] == bp
    assert reasons[("james", family.SUGAR_TEST)] == "Mother: prediabetes; father: type 2 diabetes at 58"
    assert reasons[("david", family.BP_CHECK)] == "Father: hypertension at 55, stroke at 68"
    assert not any(f["memberId"] in ("margaret-grandson", "margaret-granddaughter") for f in doc["flags"])


def test_missing_family_history_keeps_seed_relatives_and_self_based_flags():
    resources = [r for r in sources.load_bundle("margaret") if r["resourceType"] != "FamilyMemberHistory"]
    doc = build("margaret", resources)["doc"]
    assert [m["id"] for m in doc["members"]] == ["margaret", "james", "david", "sarah"]
    assert {m["generation"] for m in doc["members"]} == {1, 2}
    assert "parentId" not in by_id(doc)["david"] and "parentId" not in by_id(doc)["margaret"]
    assert by_id(doc)["margaret"]["age"] == 78 and "age" not in by_id(doc)["james"]
    assert flags(doc) == sorted((c, s) for c in ("james", "sarah") for s in (family.BP_CHECK, family.SUGAR_TEST))
    assert all("father" not in f["reason"].lower() for f in doc["flags"])


def test_no_documented_history_gives_no_flags():
    resources = [r for r in sources.load_bundle("margaret") if r["resourceType"] not in ("FamilyMemberHistory", "Condition")]
    doc = build("margaret", resources)["doc"]
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
    assert "parentId" not in by_id(doc)["david"]


def test_a_relative_without_a_name_keeps_the_relation_label_and_missing_fields_are_omitted():
    resources = copy.deepcopy(sources.load_bundle("margaret"))
    for r in resources:
        if r["id"] == "margaret-husband":
            del r["name"], r["deceasedAge"]
            r["deceasedBoolean"] = True
    husband = by_id(build("margaret", resources)["doc"])["margaret-husband"]
    assert husband["name"] == "Husband" and husband["deceased"] is True
    assert "deceasedAge" not in husband and "age" not in husband and "place" not in husband


def test_inactive_and_unconfirmed_conditions_never_enter_the_tree():
    resources = copy.deepcopy(sources.load_bundle("margaret"))
    for r in resources:
        if r["id"] == "margaret-hypertension":
            r["verificationStatus"]["coding"][0]["code"] = "unconfirmed"
    doc = build("margaret", resources)["doc"]
    assert [c["label"] for c in by_id(doc)["margaret"]["conditions"]] == [
        "hearing loss", "chronic kidney disease stage 3a", "osteoarthritis of both knees", "prediabetes"]
    assert all(not f["reason"].startswith("Mother: hypertension") for f in doc["flags"])


def test_output_is_deterministic_and_sources_list_only_used_resources():
    a, b = build("margaret"), build("margaret")
    assert a["doc"] == b["doc"]
    assert "Condition/margaret-af" not in a["sources"], "provisional AF is not used"
    assert {"FamilyMemberHistory/margaret-father", "FamilyMemberHistory/margaret-husband",
            "FamilyMemberHistory/margaret-grandson"} <= set(a["sources"])


def test_facts_behind_each_flag_are_documented_strings():
    out = build("margaret")["facts"]
    assert out[("james", family.SUGAR_TEST)] == ["mother: prediabetes", "father (deceased): type 2 diabetes at 58"]
    assert out[("james", family.BP_CHECK)] == [
        "mother: hypertension at 61", "father (deceased): hypertension at 60",
        "grandfather (deceased): hypertension at 55", "grandfather (deceased): stroke at 68"]
    assert out[("david", family.BP_CHECK)] == ["father (deceased): hypertension at 55", "father (deceased): stroke at 68"]


def test_unknown_or_living_status_is_never_marked_deceased():
    resources = copy.deepcopy(sources.load_bundle("margaret"))
    for r in resources:
        if r["resourceType"] == "FamilyMemberHistory" and r["id"] in ("margaret-father", "margaret-mother", "margaret-husband"):
            r.pop("deceasedAge", None)         # status not recorded
        if r["id"] == "margaret-mother":
            r["deceasedBoolean"] = False       # recorded as living
    out = build("margaret", resources)
    assert all("deceased" not in fact for facts in out["facts"].values() for fact in facts)
    assert all("deceased" not in m and "deceasedAge" not in m for m in out["doc"]["members"])


@pytest.mark.parametrize("field,value", [("deceasedAge", {"value": 80, "unit": "a"}), ("deceasedDate", "2010-05-01"),
                                         ("deceasedString", "died in 2010"), ("deceasedBoolean", True)])
def test_any_recorded_form_of_death_counts_as_deceased(field, value):
    resources = copy.deepcopy(sources.load_bundle("margaret"))
    for r in resources:
        if r["id"] == "margaret-brother":
            r[field] = value
    assert by_id(build("margaret", resources)["doc"])["david"]["deceased"] is True


@pytest.mark.parametrize("pid", sources.PEOPLE)
def test_no_internal_fields_leak_into_the_document(pid):
    for m in build(pid)["doc"]["members"]:
        assert set(m) <= {"id", "name", "relation", "generation", "deceased", "parentId", "conditions", "age",
                          "deceasedAge", "place"}
        for c in m["conditions"]:
            assert set(c) <= {"label", "ageAtOnset", "code", "note"}


@pytest.mark.parametrize("code,kind", [("230690007", family.STROKE), ("38341003", family.HTN),
                                       ("44054006", family.T2D), ("714628002", family.PREDIABETES)])
def test_snomed_code_alone_identifies_the_condition(code, kind):
    assert family._kind({"coding": [{"system": family.SNOMED, "code": code}], "text": "recorded by GP"}) == kind


def test_each_condition_carries_a_stable_code_next_to_its_label_and_unknown_ones_get_none():
    m = by_id(build("margaret")["doc"])
    assert {c["label"]: c["code"] for c in m["margaret"]["conditions"]} == {
        "chronic kidney disease stage 3a": "CHRONIC_KIDNEY_DISEASE", "hearing loss": "HEARING_LOSS", "hypertension": "HYPERTENSION",
        "osteoarthritis of both knees": "OSTEOARTHRITIS", "prediabetes": "PREDIABETES"}
    assert family._condition_code({"text": "glaucoma, left eye"}) == "GLAUCOMA"
    assert family._condition_code({"text": "atrial fibrillation"}) == "ATRIAL_FIBRILLATION"
    assert family._condition_code({"coding": [{"system": family.SNOMED, "code": "38341003"}], "text": "high BP"}) == "HYPERTENSION"
    assert family._condition_code({"text": "chilblains"}) is None
    assert "code" not in family._public({"label": "chilblains", "code": None})
