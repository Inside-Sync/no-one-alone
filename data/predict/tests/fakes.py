"""Fake BigQuery client for tests: records every statement and load, answers like the real client."""
from datetime import datetime, timezone
from types import SimpleNamespace

from predict import bq, forecast


class FakeJob:
    def __init__(self, rows=(), job_id="job_fake_12345678", affected=None):
        self._rows, self.job_id, self.num_dml_affected_rows = list(rows), job_id, affected

    def result(self):
        return self._rows


def forecast_rows(points_by_person):
    """AI.FORECAST-shaped rows from Point lists."""
    return [{"person_id": pid, "forecast_timestamp": datetime.fromisoformat(p.date).replace(tzinfo=timezone.utc),
             "forecast_value": p.value, "prediction_interval_lower_bound": p.lower,
             "prediction_interval_upper_bound": p.upper, "confidence_level": 0.9, "ai_forecast_status": ""}
            for pid, pts in points_by_person.items() for p in pts]


class FakeBigQuery:
    def __init__(self, *, conflicts=0, fail_merge=False, forecast=None, job_state="DONE", staging_exists=False):
        self.staging_exists = staging_exists
        self.sql, self.loads, self.get_jobs = [], [], []
        self.conflicts, self.fail_merge, self.forecast, self.job_state = conflicts, fail_merge, forecast, job_state
        self.forecast_sql = None

    def query(self, sql, location=None):
        assert location == bq.LOCATION
        self.sql.append(sql)
        if sql.startswith("SELECT COUNT(*) AS conflicts"):
            return FakeJob([(self.conflicts,)])
        if sql.startswith("MERGE"):
            if self.fail_merge:
                raise RuntimeError("merge failed")
            return FakeJob(affected=sum(n for _, n, _ in self.loads))
        if sql.startswith("SELECT person_id, COUNT(*)"):
            return FakeJob([{"person_id": p, "n": 90, "first": "2026-07-19", "last": "2026-10-16"}
                            for p in ("ba-mai", "margaret") if f"'{p}'" in sql])
        if "AI.FORECAST" in sql:
            self.forecast_sql = sql
            return FakeJob(forecast_rows(self.forecast), job_id="bqjob_r1234abcd_0001")
        return FakeJob()

    def load_table_from_json(self, rows, table, job_config=None, location=None):
        self.loads.append((table, len(rows), job_config.write_disposition))
        return FakeJob()

    def get_table(self, table_id):
        from google.api_core.exceptions import NotFound
        if table_id == bq.STAGING and self.staging_exists:
            return SimpleNamespace(table_id=table_id)
        raise NotFound(table_id)

    def get_job(self, job_id, location=None):
        self.get_jobs.append(job_id)
        rows = forecast_rows(self.forecast or {})
        return SimpleNamespace(state=self.job_state, error_result=None, query=self.forecast_sql or "",
                               result=lambda: rows)


def stand_in_points():
    from predict import sources, vitals
    return forecast.stand_in({p: vitals.generate(p) for p in sources.PEOPLE})[0]
