import json

import pytest

from predict import forecast_doc as fd, forecast_review, run, sources, vitals
from predict.explain import GeminiExplainer, check
from tests.fakes import FakeBigQuery, stand_in_points
from tests.test_explain_and_run import FakeClient, FakeDb

POINTS = stand_in_points()


def facts(pid):
    return fd.facts(pid, vitals.generate(pid), POINTS[pid], sources.load_bundle(pid))


def diag(pid, proposed):
    return fd.diagnose_drivers(facts(pid), proposed)


# --- root causes of the first run -------------------------------------------------------------------------------

def test_trend_facts_no_longer_contain_a_percent_sign_the_validator_forbids():
    trend = facts("margaret")["trend"]
    assert not any("%" in f for f in trend), "facts with '90%' made every faithful trend driver fail"
    assert any("30 days ahead" in f for f in trend)


def test_numbering_and_reason_labels_are_formatting_not_content():
    d = diag("margaret", ["1. Morning blood pressure rose 15 mmHg over 6 weeks, to 144 mmHg",
                          "Reason 2: Evening amlodipine missed 3 of 7 times this week",
                          "- Her father had a stroke at 74"])
    assert [x["accepted"] for x in d] == [True, True, True]
    assert d[0]["final"] == "Morning blood pressure rose 15 mmHg over 6 weeks, to 144 mmHg"


def test_prompt_no_longer_numbers_reasons_or_invites_percentages():
    p = fd.DRIVER_PROMPT
    assert "no numbering" in p and "% sign" in p and "1)" not in p and "Aspirin is not a blood-pressure medicine" in p


def test_section_labels_sent_to_gemini_are_names_not_numbers():
    client = FakeClient([json.dumps({"drivers": ["a", "b", "c"]})])
    from predict.explain import gemini_drivers
    gemini_drivers(GeminiExplainer(client=client), fd.DRIVER_PROMPT, fd.driver_facts(facts("margaret")))
    sent = client.models.prompts[0]
    assert "Blood-pressure trend facts:" in sent and "Reason 1" not in sent


# --- every rejection carries its exact reason ------------------------------------------------------------------

@pytest.mark.parametrize("i,text,reason", [
    (0, "Systolic may reach 152 mmHg, a 90% interval", "forbidden wording '%'"),
    (0, "Blood pressure is rising, so her risk is higher", "forbidden wording 'risk'"),
    (1, "She took 4 of 7 evening amlodipine doses", "number not in the facts: 4"),
    (2, "Her brother had a stroke at 74", "relative not in the facts: 'brother'"),
    (2, "Her father has had a stroke at 74", "present tense for the deceased father"),
    (2, "Her father had diabetes", "condition not in the facts: 'diabetes'"),
    (1, "Evening aspirin missed 3 times this week", "medicine not in the facts: 'aspirin'"),
])
def test_rejections_report_the_exact_reason(i, text, reason):
    proposed = [None, None, None]
    proposed[i] = text
    d = diag("margaret", proposed)[i]
    assert not d["accepted"] and d["reason"].startswith(reason) and d["facts"] == fd.driver_facts(facts("margaret"))[i]


def test_aspirin_is_never_called_a_blood_pressure_medicine():
    d = diag("ba-mai", [None, "Blood pressure tablets amlodipine and aspirin missed 3 times this week", None])[1]
    assert d["reason"] == "describes aspirin as a blood-pressure medicine"
    ok = diag("ba-mai", [None, "Daily medicines amlodipine and aspirin: 3 of 14 doses missed this week", None])[1]
    assert ok["accepted"], ok["reason"]


def test_missing_or_short_model_output_is_reported_not_guessed():
    d = diag("margaret", ["Morning blood pressure rose 15 mmHg over 6 weeks"])
    assert [x["reason"] for x in d][1:] == ["no proposal", "no proposal"] and "returned 1 drivers" in d[0]["note"]
    assert [x["reason"] for x in diag("margaret", None)] == ["no proposal"] * 3


def test_check_returns_none_only_for_grounded_text():
    assert check("Her father had a stroke at 74", ["father (deceased): stroke at 74"]) is None
    assert check(None, []) == "not text" and check("   ", []) == "empty"


def test_fallbacks_still_pass_with_the_medicine_guard():
    for pid in sources.PEOPLE:
        assert all(d["accepted"] for d in fd.diagnose_drivers(facts(pid), fd.fallback_drivers(facts(pid))))


# --- reuse an existing real forecast ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def no_real_clients(monkeypatch):
    def boom(*a, **k):
        raise AssertionError("a real cloud client was created")
    monkeypatch.setattr(run, "firestore_client", boom)
    monkeypatch.setattr(run.bq, "bigquery_client", boom)


def first_review(tmp_path):
    fake = FakeBigQuery(forecast=POINTS)
    path = tmp_path / "first.json"
    assert run.main(["forecast", "--bq-forecast", "--out", str(path)], bq_client=fake) == 0
    return path, fake.forecast_sql


def test_reuse_takes_the_reviewed_forecast_points_without_a_new_query(tmp_path, capsys):
    first, sql = first_review(tmp_path)
    replay = FakeBigQuery(forecast=POINTS)
    replay.forecast_sql = sql
    good = {"margaret": ["Morning blood pressure rose 15 mmHg over 6 weeks, to 144 mmHg",
                         "Evening amlodipine missed 3 of 7 times this week", "Her father had a stroke at 74"],
            "ba-mai": ["Morning blood pressure rose 14 mmHg over 6 weeks, to 145 mmHg",
                       "Daily medicines: 3 of 14 doses missed this week", "Her brother had a stroke"]}
    client = FakeClient([json.dumps({"drivers": good[p]}) for p in sources.PEOPLE])
    new, diags = tmp_path / "second.json", tmp_path / "diag.json"
    assert run.main(["forecast", "--reuse", str(first), "--gemini", "--out", str(new), "--diagnostics", str(diags)],
                    explainer=GeminiExplainer(client=client), bq_client=replay) == 0
    assert replay.sql == [] and replay.loads == [] and replay.get_jobs == ["bqjob_r1234abcd_0001"]
    a, b = json.loads(first.read_text()), json.loads(new.read_text())
    assert b["source"] == a["source"] and b["reusedForecastFrom"]["sha256"] == forecast_review.sha256(first)
    for x, y in zip(a["documents"], b["documents"]):
        assert {k: v for k, v in x["doc"].items() if k != "drivers"} == {k: v for k, v in y["doc"].items() if k != "drivers"}
    m, bm = (e for e in b["documents"])
    assert m["doc"]["drivers"] == good["margaret"] and m["driversFromModel"] == 3
    assert bm["driversFromModel"] == 2 and bm["doc"]["drivers"][2] == "Father had a stroke at 68"
    d = json.loads(diags.read_text())
    assert d["people"]["ba-mai"]["raw"] == good["ba-mai"]
    assert d["people"]["ba-mai"]["drivers"][2]["reason"] == "relative not in the facts: 'brother'"
    out = capsys.readouterr().out
    assert "no new forecast query" in out and "ba-mai family: rejected: relative not in the facts" in out
    assert run.main(["forecast", "--from", str(new)], bq_client=FakeBigQuery()) == 0


@pytest.mark.parametrize("extra", [["--bq-forecast"], ["--from", "x.json"], ["--write"]])
def test_reuse_cannot_be_combined_with_a_new_forecast_or_a_write(tmp_path, extra):
    first, _ = first_review(tmp_path)
    with pytest.raises(SystemExit):
        run.main(["forecast", "--reuse", str(first), "--gemini", "--out", str(tmp_path / "n.json"), *extra])


def test_reuse_rejects_a_tampered_file_or_a_failed_job(tmp_path):
    first, sql = first_review(tmp_path)
    payload = json.loads(first.read_text())
    payload["documents"][0]["doc"]["series"][-1]["systolicForecast"] += 1
    bad = tmp_path / "bad.json"
    bad.write_text(json.dumps(payload))
    replay = FakeBigQuery(forecast=POINTS)
    replay.forecast_sql = sql
    assert run.main(["forecast", "--reuse", str(bad), "--gemini", "--out", str(tmp_path / "n.json")],
                    explainer=GeminiExplainer(client=FakeClient([])), bq_client=replay) == 1
    failed = FakeBigQuery(job_state="RUNNING", forecast=POINTS)
    failed.forecast_sql = sql
    assert run.main(["forecast", "--reuse", str(first), "--gemini", "--out", str(tmp_path / "n.json")],
                    explainer=GeminiExplainer(client=FakeClient([])), bq_client=failed) == 1


def test_diagnostics_are_never_saved_inside_the_repo(tmp_path):
    first, sql = first_review(tmp_path)
    replay = FakeBigQuery(forecast=POINTS)
    replay.forecast_sql = sql
    inside = sources.REPO / "data" / "predict" / "diag.json"
    try:
        assert run.main(["forecast", "--reuse", str(first), "--gemini", "--out", str(tmp_path / "n.json"),
                         "--diagnostics", str(inside)],
                        explainer=GeminiExplainer(client=FakeClient([json.dumps({"drivers": []})] * 2)),
                        bq_client=replay) == 2
        assert not inside.exists()
    finally:
        inside.unlink(missing_ok=True)
