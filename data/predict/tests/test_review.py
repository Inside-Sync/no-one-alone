import json

import pytest

from predict import review, run, sources
from predict.explain import GeminiExplainer
from tests.test_explain_and_run import FakeClient, FakeDb

GOOD = {"margaret": "Your mother has hypertension and your grandfather had a stroke at 74, so a blood pressure "
                    "check is suggested.",
        "ba-mai": "Your mother has hypertension and your grandfather had a stroke at 68, so a blood pressure "
                  "check is suggested."}


class Boom:
    """An explainer that fails the test if anything asks it for text."""

    def explain(self, *a, **k):
        raise AssertionError("--from must never call Gemini")


def generate(tmp_path, name="families.json"):
    """Runs the CLI with a fake Gemini that explains blood pressure checks only, and saves the review file."""
    replies = [json.dumps({"explanation": GOOD[pid]}) for pid in sources.PEOPLE for _ in range(3)]
    gemini = GeminiExplainer(client=FakeClient(replies))

    class BpOnly:
        def explain(self, prompt, facts, allowed_terms=()):
            return gemini.explain(prompt, facts, allowed_terms) if "blood pressure check" in allowed_terms else None

    path = tmp_path / name
    assert run.main(["family", "--person", "all", "--out", str(path)], explainer=BpOnly()) == 0
    return path


def edit(path, change):
    payload = json.loads(path.read_text(encoding="utf-8"))
    change(payload)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def test_round_trip_generate_save_load_write_without_gemini(tmp_path, capsys):
    path = generate(tmp_path)
    saved = capsys.readouterr().out
    digest = review.sha256(path)
    assert f"saved {path} sha256 {digest}" in saved
    db = FakeDb()
    assert run.main(["family", "--from", str(path), "--write"], db=db, explainer=Boom()) == 0
    out = capsys.readouterr().out
    assert f"sha256 {digest}" in out
    stored = json.loads(path.read_text(encoding="utf-8"))["documents"]
    assert [(c, i, d) for c, i, d in db.sets] == [("families", e["personId"], e["doc"]) for e in stored]
    assert any("explanation" in f for _, _, d in db.sets for f in d["flags"])


def test_from_is_a_dry_run_unless_write_is_given(tmp_path, capsys):
    path = generate(tmp_path)
    capsys.readouterr()
    assert run.main(["family", "--from", str(path)], explainer=Boom()) == 0
    out = capsys.readouterr().out
    assert "DRY RUN: would set families/margaret" in out and "WROTE" not in out


def test_from_cannot_be_combined_with_gemini_or_out(tmp_path):
    path = generate(tmp_path)
    for extra in (["--gemini"], ["--out", str(tmp_path / "again.json")]):
        with pytest.raises(SystemExit):
            run.main(["family", "--from", str(path), *extra])


def test_review_files_are_never_saved_inside_the_repo(capsys):
    target = sources.REPO / "data" / "predict" / "test-review-guard.json"
    assert not target.exists()
    try:
        assert run.main(["family", "--person", "margaret", "--out", str(target)]) == 2
        assert not target.exists()
    finally:
        target.unlink(missing_ok=True)


@pytest.mark.parametrize("tamper,expect", [
    (lambda p: p["documents"][0]["doc"]["flags"][0].update(explanation="Your aunt had a stroke at 50."), "not grounded"),
    (lambda p: p["documents"][0]["doc"]["members"][0]["conditions"].append({"label": "cancer"}), "differ"),
    (lambda p: p["documents"][0].update(path="families/ba-mai"), "path must be"),
    (lambda p: p["documents"][0].update(personId="ba-mai"), "each person may appear once"),
    (lambda p: p["documents"].__setitem__(0, {**p["documents"][1], "personId": "margaret", "path": "families/margaret"}),
     "wrong person"),
    (lambda p: p["documents"][0].update(personId="lan", path="families/lan"), "unknown personId"),
    (lambda p: p["documents"][0]["doc"]["flags"][0].update(explanation=None), "never null"),
    (lambda p: p.update(kind="forecast-review"), "not a families review file"),
])
def test_tampered_or_mismatched_files_are_rejected_and_nothing_is_written(tmp_path, capsys, tamper, expect):
    path = generate(tmp_path)
    edit(path, tamper)
    db = FakeDb()
    assert run.main(["family", "--from", str(path), "--write"], db=db, explainer=Boom()) == 1
    assert db.sets == []
    assert expect in capsys.readouterr().err


def test_person_filter_must_be_present_in_the_file(tmp_path, capsys):
    path = tmp_path / "one.json"
    assert run.main(["family", "--person", "margaret", "--out", str(path)]) == 0
    capsys.readouterr()
    assert run.main(["family", "--person", "ba-mai", "--from", str(path), "--write"], db=FakeDb()) == 1
    assert "does not hold every requested person" in capsys.readouterr().err


def test_unreadable_file_is_rejected(tmp_path, capsys):
    bad = tmp_path / "bad.json"
    bad.write_text("{not json", encoding="utf-8")
    assert run.main(["family", "--from", str(bad), "--write"], db=FakeDb()) == 1
    assert "cannot read review file" in capsys.readouterr().err
