import copy
import json
from dataclasses import replace
from datetime import date

import pytest

from predict import forecast, forecast_doc, risk, sources, vitals
from predict.contract import check_forecast_doc
from predict.explain import GeminiExplainer, NoExplainer, gemini_drivers
from tests.fakes import FakeBigQuery, forecast_rows, stand_in_points
from tests.test_explain_and_run import FakeClient

SEED = sources.load_seed()
POINTS = stand_in_points()


def test_forecast_sql_reads_only_rows_up_to_story_day_21():
    sql = forecast.forecast_sql(sources.PEOPLE)
    assert "AI.FORECAST(" in sql and "date <= DATE '2026-09-04'" in sql
    assert "person_id IN ('margaret', 'ba-mai')" in sql
    assert "data_col => 'systolic'" in sql and "timestamp_col => 'date'" in sql and "id_cols => ['person_id']" in sql
    assert "horizon => 30" in sql and "confidence_level => 0.9" in sql


@pytest.mark.parametrize("people,as_of", [(["Margaret"], vitals.AS_OF), (["margaret"], "2026-09-04")])
def test_forecast_sql_rejects_unvalidated_input(people, as_of):
    with pytest.raises(ValueError):
        forecast.forecast_sql(people, as_of)


def test_run_forecast_parses_points_and_records_provenance():
    fake = FakeBigQuery(forecast=POINTS)
    points, source = forecast.run_forecast(fake, sources.PEOPLE)
    assert points == POINTS
    assert source == {"kind": "bigquery", "jobId": "bqjob_r1234abcd_0001", "location": "asia-southeast1",
                      "sql": forecast.forecast_sql(sources.PEOPLE)}
    assert fake.loads == [] and not any(s.startswith("MERGE") for s in fake.sql), "a forecast never writes BigQuery"


@pytest.mark.parametrize("mutate,expect", [
    (lambda rows: rows.pop(5), "30 days"),
    (lambda rows: rows[0].update(ai_forecast_status="not enough data"), "status"),
    (lambda rows: rows[0].update(person_id="lan"), "unexpected person"),
    (lambda rows: rows[3].update(forecast_value=999), "outside its interval"),
    (lambda rows: [rows.pop() for _ in range(30)], "30 days"),
])
def test_parse_rejects_incomplete_or_inconsistent_forecasts(mutate, expect):
    rows = forecast_rows(POINTS)
    mutate(rows)
    with pytest.raises(forecast.ForecastInvalid, match=expect):
        forecast.parse(rows, sources.PEOPLE)


def test_parse_accepts_rows_out_of_order():
    rows = forecast_rows(POINTS)[::-1]
    assert forecast.parse(rows, sources.PEOPLE) == POINTS


def test_stand_in_is_labelled_and_ignores_rows_after_day_21():
    rows = {p: vitals.generate(p) for p in sources.PEOPLE}
    future_changed = {p: [dict(r, systolic=r["systolic"] + 50) if r["date"] > "2026-09-04" else r for r in rs]
                      for p, rs in rows.items()}
    a, src = forecast.stand_in(rows)
    b, _ = forecast.stand_in(future_changed)
    assert a == b and src["kind"] == "local-stand-in" and src["jobId"] is None


@pytest.mark.parametrize("upper,adherence,parent,level", [
    (151, 0.5, False, "HIGH"), (151, 0.9, True, "HIGH"), (151, 0.9, False, "MEDIUM"),
    (150, 0.5, True, "MEDIUM"), (150, 0.8, False, "LOW"), (140, 0.79, False, "MEDIUM"),
])
def test_risk_rules(upper, adherence, parent, level):
    assert risk.classify(upper, adherence, parent) == [{"condition": "STROKE", "horizonDays": 90, "level": level}]


def build(pid, proposed=None):
    return forecast_doc.build(pid, vitals.generate(pid), POINTS[pid], sources.load_bundle(pid), SEED, proposed)


@pytest.mark.parametrize("pid", sources.PEOPLE)
def test_documents_match_the_web_forecast_contract(pid):
    doc = build(pid)["doc"]
    assert check_forecast_doc(doc) == []
    assert doc["asOf"] == "2026-09-04T00:00:00Z" and doc["storyDay"] == 21
    observed = [p for p in doc["series"] if "systolic" in p]
    ahead = [p for p in doc["series"] if "systolicForecast" in p]
    assert len(observed) == 48 and max(p["date"] for p in observed) == "2026-09-04", "no observed point after day 21"
    assert len(ahead) == 30 and ahead[0]["date"] == "2026-09-05"


@pytest.mark.parametrize("pid", sources.PEOPLE)
def test_no_percentages_or_probabilities_and_the_method_states_the_cutoff(pid):
    doc = build(pid)["doc"]
    shown = json.dumps({k: v for k, v in doc.items() if k != "method"})
    assert "%" not in shown and "probab" not in shown.lower()
    m = doc["method"]
    assert "AI.FORECAST" in m and "90 days" in m and "48 days up to story day 21" in m and "not a clinical probability" in m


def test_drivers_follow_trend_pill_tree_and_come_from_fhir_and_the_series():
    m = build("margaret")["doc"]
    assert m["drivers"][0].startswith("Morning blood pressure up 15 mmHg over 6 weeks")
    assert m["drivers"][1] == "Evening blood pressure tablet missed 3 times this week"
    assert m["drivers"][2] == "Father had a stroke at 74"
    b = build("ba-mai")["doc"]
    assert b["drivers"][1] == "Daily medicine doses missed 3 times this week"
    assert b["drivers"][2] == "Father had a stroke at 68"
    assert not any("brother" in d.lower() for d in m["drivers"] + b["drivers"])


@pytest.mark.parametrize("pid,owner,name", [("margaret", "david", "David"), ("ba-mai", "ong-hung", "Ông Hùng")])
def test_action_is_a_rule_for_the_first_nearby_family_member(pid, owner, name):
    action = build(pid)["doc"]["action"]
    assert action == {"text": f"Share the blood pressure trend with the clinic; {name} sets up a weekly pill box",
                      "ownerMemberId": owner}


def test_valid_model_drivers_are_kept_and_invalid_ones_fall_back_one_by_one():
    proposed = ["Morning blood pressure rose 15 mmHg in 6 weeks, to 144 mmHg",
                "She missed her evening tablet 3 times, so her risk is higher",   # risk claim
                "Her brother had a stroke at 60"]                                   # invented relative
    out = build("margaret", proposed)
    assert out["driversFromModel"] == 1
    assert out["doc"]["drivers"] == [proposed[0], "Evening blood pressure tablet missed 3 times this week",
                                     "Father had a stroke at 74"]


def test_fallback_drivers_pass_their_own_validation():
    for pid in sources.PEOPLE:
        out = build(pid)
        chosen, used = forecast_doc.choose_drivers(out["facts"], out["doc"]["drivers"])
        assert chosen == out["doc"]["drivers"] and used == 3


def test_gemini_drivers_uses_one_call_and_survives_failures():
    facts = forecast_doc.driver_facts(build("margaret")["facts"])
    g = GeminiExplainer(client=FakeClient([json.dumps({"drivers": ["a", "b", "c"]}), RuntimeError("quota")]))
    assert gemini_drivers(g, "p", facts) == ["a", "b", "c"]
    assert gemini_drivers(g, "p", facts) is None
    assert (g.calls, g.rejected) == (2, 1)
    assert gemini_drivers(NoExplainer(), "p", facts) is None


@pytest.mark.parametrize("mutate,expect", [
    (lambda d: d.update(asOf="2026-09-04"), "asOf"),
    (lambda d: d["risks"][0].update(level="SEVERE"), "level"),
    (lambda d: d["series"][0].update(systolic=None), "never null"),
    (lambda d: d["series"][0].update(note="x"), "series[0]"),
    (lambda d: d.update(probability=0.02), "keys"),
    (lambda d: d["action"].pop("text"), "action.text"),
])
def test_forecast_contract_check_catches_shape_errors(mutate, expect):
    doc = copy.deepcopy(build("margaret")["doc"])
    mutate(doc)
    assert any(expect in p for p in check_forecast_doc(doc))
