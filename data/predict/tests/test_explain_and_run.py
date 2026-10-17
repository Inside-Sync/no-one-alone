import json

import pytest

from predict import run
from predict.explain import GeminiExplainer, validate

FACTS = ["mother: hypertension", "grandfather: stroke at 74"]
ALLOWED = ("blood pressure check",)


@pytest.mark.parametrize("text", [
    "Your mother has hypertension and your grandfather had a stroke at 74, so a blood pressure check is a good idea.",
    "A blood pressure check is suggested because of your mother's hypertension.",
])
def test_grounded_explanations_pass(text):
    assert validate(text, FACTS, ALLOWED) == text


@pytest.mark.parametrize("text", [
    "Your grandfather had a stroke at 68.",                        # number not in the facts
    "Your aunt also had high blood pressure.",                     # relative not in the facts
    "Your mother may also have diabetes.",                         # condition not in the facts
    "You have a 30% higher risk of stroke.",                       # probability
    "Your mother was diagnosed with hypertension.",                # diagnostic wording
    "You will develop hypertension like your mother.",             # prediction
    "x" * 241,                                                     # too long
    "",
    None,
    42,
])
def test_ungrounded_or_unsafe_explanations_are_rejected(text):
    assert validate(text, FACTS, ALLOWED) is None


DECEASED_FACTS = ["mother: prediabetes", "grandfather (deceased): type 2 diabetes"]


@pytest.mark.parametrize("text", [
    "Your grandfather had type 2 diabetes and your mother has prediabetes, so a blood sugar test is suggested.",
    "Your late grandfather had type 2 diabetes.",
])
def test_deceased_relatives_in_past_tense_pass(text):
    assert validate(text, DECEASED_FACTS, ("blood sugar test",)) == text


@pytest.mark.parametrize("text", [
    "Your grandfather has type 2 diabetes.",                       # present tense for a deceased relative
    "Your mother and grandfather have diabetes.",
    "Your grandfather is living with type 2 diabetes.",
    "Your late mother had prediabetes.",                           # mother's status is not recorded
    "Your mother, who sadly died, had prediabetes.",
    "Your mother has prediabetes, and your deceased grandfathers had type 2 diabetes.",   # one grandfather only
    "Your grandfather had type 2 diabetes, so you may be at higher risk.",               # risk claim
    "Your grandfather had type 2 diabetes, which makes it likely for you too.",
])
def test_wrong_tense_or_invented_death_is_rejected(text):
    assert validate(text, DECEASED_FACTS, ("blood sugar test",)) is None


@pytest.mark.parametrize("text", ["Your mother, who died, had prediabetes.",
                                  "A blood sugar test is suggested; your mother is deceased."])
def test_death_words_are_rejected_when_nobody_is_recorded_deceased(text):
    assert validate(text, ["mother: prediabetes"], ("blood sugar test",)) is None


def test_prompt_tells_gemini_about_the_deceased_marker():
    assert "(deceased)" in run.FLAG_PROMPT and "past tense" in run.FLAG_PROMPT


class FakeModels:
    def __init__(self, replies):
        self.replies, self.prompts = list(replies), []

    def generate_content(self, model, contents, config):
        self.prompts.append(contents)
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return type("R", (), {"text": reply})()


class FakeClient:
    def __init__(self, replies):
        self.models = FakeModels(replies)


def test_gemini_explainer_validates_and_counts_rejections():
    good = json.dumps({"explanation": "Your mother has hypertension, so a blood pressure check is sensible."})
    bad = json.dumps({"explanation": "Your sister had a stroke."})
    client = FakeClient([good, bad, RuntimeError("quota"), "not json"])
    g = GeminiExplainer(client=client)
    assert g.explain("p", FACTS, ALLOWED).startswith("Your mother")
    assert g.explain("p", FACTS, ALLOWED) is None
    assert g.explain("p", FACTS, ALLOWED) is None
    assert g.explain("p", FACTS, ALLOWED) is None
    assert (g.calls, g.rejected) == (4, 3)
    assert "grandfather: stroke at 74" in client.models.prompts[0], "the prompt carries only the given facts"


class FakeDb:
    def __init__(self):
        self.sets = []

    def collection(self, name):
        db = self

        class Doc:
            def __init__(self, doc_id):
                self.doc_id = doc_id

            def set(self, doc):
                db.sets.append((name, self.doc_id, doc))

        return type("C", (), {"document": lambda _, i: Doc(i)})()


def test_dry_run_writes_nothing_and_checks_both_documents(capsys):
    assert run.main(["family", "--person", "all"]) == 0
    out = capsys.readouterr().out
    assert "DRY RUN: would set families/margaret" in out and "DRY RUN: would set families/ba-mai" in out
    assert "families/margaret: 6 members, 6 flags, 0 explained" in out
    assert "families/ba-mai: 5 members, 3 flags, 0 explained" in out


def test_write_sets_whole_documents_only_in_families():
    db = FakeDb()
    assert run.main(["family", "--person", "all", "--write"], db=db) == 0
    assert [(c, i) for c, i, _ in db.sets] == [("families", "margaret"), ("families", "ba-mai")]
    assert set(db.sets[0][2]) == {"members", "flags"}


def test_gemini_explanations_are_added_only_when_valid():
    replies = [json.dumps({"explanation": "Your mother has hypertension and your grandfather had a stroke at 74, "
                                          "so a blood pressure check is sensible."}),
               json.dumps({"explanation": "Your cousin has diabetes."})] * 3
    db = FakeDb()
    assert run.main(["family", "--person", "margaret", "--write"], db=db,
                    explainer=GeminiExplainer(client=FakeClient(replies))) == 0
    flags = db.sets[0][2]["flags"]
    # David is her brother: "your mother ... grandfather" is not in his facts, so both his flags stay unexplained
    assert [(f["memberId"], "explanation" in f) for f in flags] == [("james", True), ("james", False), ("david", False),
                                                                    ("david", False), ("sarah", True), ("sarah", False)]


def test_firestore_writer_refuses_other_collections():
    from predict.firestore_out import write_doc
    with pytest.raises(ValueError):
        write_doc(FakeDb(), "incidents", "x", {}, write=True)
