import json

import pytest

from predict import forecast_review, run, sources
from tests.fakes import FakeBigQuery, stand_in_points
from tests.test_explain_and_run import FakeDb

POINTS = stand_in_points()


@pytest.fixture(autouse=True)
def no_real_clients(monkeypatch):
    def boom(*a, **k):
        raise AssertionError("a real cloud client was created")
    monkeypatch.setattr(run, "firestore_client", boom)
    monkeypatch.setattr(run.bq, "bigquery_client", boom)


class Boom:
    def explain(self, *a, **k):
        raise AssertionError("Gemini must not be called")


def generate(tmp_path, fake=None):
    fake = fake or FakeBigQuery(forecast=POINTS)
    path = tmp_path / "forecasts.review.json"
    assert run.main(["forecast", "--bq-forecast", "--out", str(path)], bq_client=fake) == 0
    return path, fake


def edit(path, change):
    payload = json.loads(path.read_text(encoding="utf-8"))
    change(payload)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


# --- separation of BigQuery and Firestore writes ----------------------------------------------------------------

def test_vitals_dry_run_touches_nothing(capsys):
    assert run.main(["vitals"]) == 0
    out = capsys.readouterr().out
    assert "DRY RUN: would load 180 rows" in out and "MERGE" in out


def test_vitals_write_bq_writes_bigquery_only():
    fake = FakeBigQuery()
    assert run.main(["vitals", "--write-bq"], bq_client=fake) == 0      # firestore_client would raise
    assert any(s.startswith("MERGE") for s in fake.sql)


def test_vitals_conflicts_abort_with_nothing_merged(capsys):
    fake = FakeBigQuery(conflicts=2)
    assert run.main(["vitals", "--write-bq"], bq_client=fake) == 1
    assert not any(s.startswith("MERGE") for s in fake.sql) and "aborted" in capsys.readouterr().err


def test_vitals_has_no_firestore_flag():
    with pytest.raises(SystemExit):
        run.main(["vitals", "--write"])


def test_forecast_never_writes_bigquery(tmp_path):
    _, fake = generate(tmp_path)
    assert fake.loads == [] and not any(s.split()[0] in ("MERGE", "CREATE", "DROP") for s in fake.sql)


@pytest.mark.parametrize("argv", [["forecast", "--write"], ["forecast", "--gemini"], ["forecast", "--out", "/tmp/x.json"],
                                  ["forecast", "--from", "/tmp/x.json", "--bq-forecast"]])
def test_forecast_flag_rules(argv):
    with pytest.raises(SystemExit):
        run.main(argv)


def test_default_forecast_run_is_a_labelled_stand_in_dry_run(capsys):
    assert run.main(["forecast"]) == 0
    out = capsys.readouterr().out
    assert "LOCAL STAND-IN forecast (not AI.FORECAST)" in out and "DRY RUN: would set forecasts/margaret" in out


# --- review round trip ------------------------------------------------------------------------------------------

def test_round_trip_real_forecast_save_load_write(tmp_path, capsys):
    path, fake = generate(tmp_path)
    digest = forecast_review.sha256(path)
    assert f"saved {path} sha256 {digest}" in capsys.readouterr().out
    db = FakeDb()
    replay = FakeBigQuery(forecast=POINTS)
    replay.forecast_sql = fake.forecast_sql
    assert run.main(["forecast", "--from", str(path), "--write"], db=db, explainer=Boom(), bq_client=replay) == 0
    assert replay.get_jobs == ["bqjob_r1234abcd_0001"] and replay.sql == [], "only job metadata, no query"
    stored = json.loads(path.read_text(encoding="utf-8"))["documents"]
    assert [(c, i, d) for c, i, d in db.sets] == [("forecasts", e["personId"], e["doc"]) for e in stored]


def test_from_without_write_is_a_dry_run_with_no_cloud_calls(tmp_path, capsys):
    path, _ = generate(tmp_path)
    replay = FakeBigQuery(forecast=POINTS)
    assert run.main(["forecast", "--from", str(path)], explainer=Boom(), bq_client=replay) == 0
    assert replay.get_jobs == [] and "DRY RUN: would set forecasts/ba-mai" in capsys.readouterr().out


def test_stand_in_results_can_never_be_saved_or_written(tmp_path):
    with pytest.raises(ValueError, match="real BigQuery"):
        forecast_review.save(tmp_path / "x.json", {}, {"kind": "local-stand-in"}, project="p", model=None)
    path, _ = generate(tmp_path)
    edit(path, lambda p: p["source"].update(kind="local-stand-in"))
    db = FakeDb()
    assert run.main(["forecast", "--from", str(path), "--write"], db=db, bq_client=FakeBigQuery()) == 1
    assert db.sets == []


def test_review_files_are_never_saved_inside_the_repo(tmp_path):
    with pytest.raises(ValueError, match="outside the repository"):
        forecast_review.save(sources.REPO / "data" / "predict" / "f.json", {}, {"kind": "bigquery"}, project="p", model=None)


def _driver(p, text):
    p["documents"][0]["doc"]["drivers"][2] = text


@pytest.mark.parametrize("tamper,expect", [
    (lambda p: p["source"].update(jobId=None), "did not come from a BigQuery"),
    (lambda p: p["source"].update(sql=p["source"]["sql"].replace("date <= DATE '2026-09-04'", "TRUE")), "cutoff"),
    (lambda p: p["documents"][0]["doc"]["risks"][0].update(level="LOW"), "risks differs"),
    (lambda p: p["documents"][0]["doc"]["action"].update(ownerMemberId="aisha"), "action differs"),
    (lambda p: _driver(p, "Her brother had a stroke at 60"), "not grounded"),
    (lambda p: _driver(p, "Father had a stroke at 74 (2% risk)"), "percentages"),
    (lambda p: p["documents"][0]["doc"]["series"][3].update(systolic=180), "observed series differs"),
    (lambda p: p["documents"][0]["doc"]["series"].insert(48, {"date": "2026-09-05", "systolic": 150}), "observed series"),
    (lambda p: p["documents"][0]["doc"]["series"].pop(-1), "30 days"),
    (lambda p: p["documents"][0].update(path="forecasts/ba-mai"), "path must be"),
    (lambda p: p["documents"].__setitem__(0, {**p["documents"][1], "personId": "margaret", "path": "forecasts/margaret"}),
     "differs"),
    (lambda p: p.update(kind="families-review"), "not a forecasts review file"),
])
def test_tampered_files_are_rejected_and_nothing_is_written(tmp_path, capsys, tamper, expect):
    path, fake = generate(tmp_path)
    capsys.readouterr()
    edit(path, tamper)
    db = FakeDb()
    replay = FakeBigQuery(forecast=POINTS)
    replay.forecast_sql = fake.forecast_sql
    assert run.main(["forecast", "--from", str(path), "--write"], db=db, explainer=Boom(), bq_client=replay) == 1
    assert db.sets == []
    assert expect in capsys.readouterr().err


@pytest.mark.parametrize("state,query", [("RUNNING", "AI.FORECAST"), ("DONE", "SELECT 1")])
def test_write_requires_the_recorded_job_to_be_a_finished_ai_forecast(tmp_path, state, query):
    path, _ = generate(tmp_path)
    replay = FakeBigQuery(job_state=state, forecast=POINTS)
    replay.forecast_sql = query
    db = FakeDb()
    assert run.main(["forecast", "--from", str(path), "--write"], db=db, bq_client=replay) == 1
    assert db.sets == []


def test_gemini_drivers_are_saved_only_when_grounded(tmp_path):
    from tests.test_explain_and_run import FakeClient
    from predict.explain import GeminiExplainer
    good = ["Morning blood pressure rose 15 mmHg over 6 weeks, to 144 mmHg",
            "Her evening tablet was missed 3 times this week", "Her father had a stroke at 74"]
    bad = ["Blood pressure is rising", "Doses missed", "Her mother and brother had strokes"]
    g = GeminiExplainer(client=FakeClient([json.dumps({"drivers": good}), json.dumps({"drivers": bad})]))
    path = tmp_path / "f.json"
    assert run.main(["forecast", "--bq-forecast", "--gemini", "--out", str(path)], explainer=g,
                    bq_client=FakeBigQuery(forecast=POINTS)) == 0
    docs = {e["personId"]: e for e in json.loads(path.read_text(encoding="utf-8"))["documents"]}
    assert docs["margaret"]["doc"]["drivers"] == good and docs["margaret"]["driversFromModel"] == 3
    assert docs["ba-mai"]["driversFromModel"] < 3 and "brother" not in " ".join(docs["ba-mai"]["doc"]["drivers"])


def test_write_rejects_forecast_points_that_differ_from_the_bigquery_job_results(tmp_path, capsys):
    path, fake = generate(tmp_path)
    edit(path, lambda p: p["documents"][0]["doc"]["series"][-1].update(systolicForecast=p["documents"][0]["doc"]["series"][-1]["systolicForecast"] + 0.5))
    replay = FakeBigQuery(forecast=POINTS)
    replay.forecast_sql = fake.forecast_sql
    db = FakeDb()
    assert run.main(["forecast", "--from", str(path), "--write"], db=db, bq_client=replay) == 1
    assert db.sets == [] and "differ from the results of job" in capsys.readouterr().err
