import re
from datetime import date

import pytest

from predict import bq, sources, vitals
from tests.fakes import FakeBigQuery


@pytest.mark.parametrize("pid", sources.PEOPLE)
def test_ninety_deterministic_daily_rows_matching_the_contract_schema(pid):
    rows = vitals.generate(pid)
    assert len(rows) == 90 and rows == vitals.generate(pid)
    assert (rows[0]["date"], rows[-1]["date"]) == ("2026-07-19", "2026-10-16")
    assert [r["date"] for r in rows] == sorted({r["date"] for r in rows})
    for r in rows:
        assert tuple(r) == vitals.COLUMNS
        assert all(isinstance(r[c], int) and not isinstance(r[c], bool) for c in vitals.COLUMNS[2:])
        assert 100 < r["systolic"] < 200 and 50 < r["diastolic"] < 120 and 0 <= r["meds_taken"] <= r["meds_scheduled"]


@pytest.mark.parametrize("pid", sources.PEOPLE)
def test_day_21_cutoff_keeps_48_days_and_nothing_after_the_forecast_date(pid):
    hist = vitals.history(vitals.generate(pid))
    assert len(hist) == 48 and hist[-1]["date"] == "2026-09-04" == vitals.AS_OF.isoformat()
    assert all(date.fromisoformat(r["date"]) <= vitals.AS_OF for r in hist)


@pytest.mark.parametrize("pid,low,high", [("margaret", 142, 147), ("ba-mai", 142, 148)])
def test_blood_pressure_rises_to_day_21_and_three_doses_are_missed_that_week(pid, low, high):
    rows = vitals.generate(pid)
    week = vitals.window(rows, 15, 21)
    assert low <= vitals.mean(week, "systolic") <= high
    assert sum(r["meds_scheduled"] - r["meds_taken"] for r in week) == 3


@pytest.mark.parametrize("pid", sources.PEOPLE)
def test_tracked_medicines_are_active_in_the_fhir_record(pid):
    active = {(r.get("medicationCodeableConcept") or {}).get("text") for r in sources.load_bundle(pid)
              if r["resourceType"] == "MedicationStatement" and r.get("status") == "active"}
    assert set(vitals.PROFILES[pid].tracked_meds) <= active


def rows():
    return [r for p in sources.PEOPLE for r in vitals.generate(p)]


def test_dry_run_makes_no_client_calls():
    out = bq.load_scoped(None, rows())
    assert out["dryRun"] and out["rows"] == 180 and out["people"] == ["ba-mai", "margaret"]


def test_write_runs_create_stage_check_merge_drop_readback_in_order():
    fake = FakeBigQuery()
    out = bq.load_scoped(fake, rows(), write=True)
    kinds = [s.split()[0] + (" conflicts" if "conflicts" in s else "") for s in fake.sql]
    assert kinds == ["CREATE", "SELECT conflicts", "MERGE", "DROP", "SELECT"]
    assert fake.loads == [(bq.STAGING, 180, "WRITE_TRUNCATE")], "only the staging table is truncated"
    assert out["inserted"] == 180 and [r["n"] for r in out["readback"]] == [90, 90]


def test_no_statement_can_delete_or_overwrite_rows_in_vitals_daily():
    fake = FakeBigQuery()
    bq.load_scoped(fake, rows(), write=True)
    for sql in fake.sql:
        assert not re.search(r"\b(TRUNCATE|DELETE|UPDATE)\b", sql)
        if sql.startswith("DROP"):
            assert bq.STAGING in sql and f"`{bq.TABLE}`" not in sql
    merge = next(s for s in fake.sql if s.startswith("MERGE"))
    assert "WHEN NOT MATCHED THEN INSERT" in merge and "WHEN MATCHED" not in merge.replace("WHEN NOT MATCHED", "")


def test_conflicting_existing_rows_abort_before_merge_and_staging_is_dropped():
    fake = FakeBigQuery(conflicts=4)
    with pytest.raises(bq.LoadAborted):
        bq.load_scoped(fake, rows(), write=True)
    assert not any(s.startswith("MERGE") for s in fake.sql)
    assert fake.sql[-1].startswith("DROP TABLE IF EXISTS") and bq.STAGING in fake.sql[-1]


def test_merge_failure_still_drops_staging():
    fake = FakeBigQuery(fail_merge=True)
    with pytest.raises(RuntimeError):
        bq.load_scoped(fake, rows(), write=True)
    assert fake.sql[-1].startswith("DROP TABLE IF EXISTS")


def test_conflict_check_compares_every_value_column_null_safely():
    sql = bq.conflict_sql()
    for c in vitals.COLUMNS[2:]:
        assert f"T.{c} IS DISTINCT FROM S.{c}" in sql
    assert "USING (person_id, date)" in sql


@pytest.mark.parametrize("bad", ["Margaret", "x'; DROP TABLE t; --", "../x"])
def test_person_ids_are_validated_before_they_reach_sql(bad):
    with pytest.raises(ValueError):
        bq.readback_sql([bad])


def test_an_existing_staging_table_aborts_before_anything_is_loaded():
    fake = FakeBigQuery(staging_exists=True)
    with pytest.raises(bq.LoadAborted, match="already exists"):
        bq.load_scoped(fake, rows(), write=True)
    assert fake.sql == [] and fake.loads == []


def test_every_job_id_is_recorded():
    out = bq.load_scoped(FakeBigQuery(), rows(), write=True)
    assert [s for s, _ in out["jobs"]] == ["create", "load-staging", "conflict-check", "merge", "drop-staging", "readback"]
