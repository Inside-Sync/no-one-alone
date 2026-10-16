"""BigQuery AI.FORECAST (TimesFM) on systolic blood pressure, input cut at story day 21."""
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta

from .bq import LOCATION, TABLE, _ids
from .vitals import AS_OF, history

HORIZON, CONFIDENCE = 30, 0.9
BIGQUERY, STAND_IN = "bigquery", "local-stand-in"


class ForecastInvalid(Exception):
    pass


@dataclass(frozen=True)
class Point:
    date: str
    value: float
    lower: float
    upper: float


def forecast_sql(people, as_of: date = AS_OF, horizon: int = HORIZON, confidence: float = CONFIDENCE) -> str:
    if not isinstance(as_of, date):
        raise ValueError("as_of must be a date")
    return (
        "SELECT * FROM AI.FORECAST(\n"
        f"  (SELECT person_id, date, systolic FROM `{TABLE}`\n"
        f"   WHERE person_id IN ({_ids(people)}) AND date <= DATE '{as_of.isoformat()}'),\n"
        "  data_col => 'systolic', timestamp_col => 'date', id_cols => ['person_id'],\n"
        f"  horizon => {int(horizon)}, confidence_level => {float(confidence)})"
    )


def _day(value) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)[:10]


def check(points: list[Point], as_of: date = AS_OF, horizon: int = HORIZON) -> list[str]:
    """Problems with one person's forecast: exactly `horizon` consecutive days after as_of, lower <= value <= upper."""
    problems = []
    expected = [(as_of + timedelta(days=i)).isoformat() for i in range(1, horizon + 1)]
    if [p.date for p in points] != expected:
        problems.append(f"forecast dates must be the {horizon} days after {as_of.isoformat()}")
    for p in points:
        if not (p.lower <= p.value <= p.upper):
            problems.append(f"{p.date}: value outside its interval")
            break
    return problems


def parse(rows, people, as_of: date = AS_OF, horizon: int = HORIZON) -> dict[str, list[Point]]:
    by_person: dict[str, list[Point]] = {p: [] for p in people}
    for r in rows:
        pid = r["person_id"]
        if pid not in by_person:
            raise ForecastInvalid(f"unexpected person in forecast: {pid!r}")
        if r.get("ai_forecast_status"):
            raise ForecastInvalid(f"{pid}: AI.FORECAST status {r['ai_forecast_status']!r}")
        by_person[pid].append(Point(_day(r["forecast_timestamp"]), round(float(r["forecast_value"]), 1),
                                    round(float(r["prediction_interval_lower_bound"]), 1),
                                    round(float(r["prediction_interval_upper_bound"]), 1)))
    for pid, pts in by_person.items():
        pts.sort(key=lambda p: p.date)
        if problems := check(pts, as_of, horizon):
            raise ForecastInvalid(f"{pid}: {problems[0]}")
    return by_person


def run_forecast(client, people) -> tuple[dict[str, list[Point]], dict]:
    """The real AI.FORECAST job. Returns the points and the job's provenance (id, location, SQL)."""
    sql = forecast_sql(people)
    job = client.query(sql, location=LOCATION)
    rows = [dict(r.items()) for r in job.result()]
    return parse(rows, people), {"kind": BIGQUERY, "jobId": job.job_id, "location": LOCATION, "sql": sql}


def stand_in(rows_by_person: dict[str, list[dict]]) -> tuple[dict[str, list[Point]], dict]:
    """Local straight-line projection from the last 14 days of history. Dry runs and tests only."""
    out = {}
    for pid, rows in rows_by_person.items():
        hist = history(rows)[-14:]
        slope = (hist[-1]["systolic"] - hist[0]["systolic"]) / (len(hist) - 1)
        last = sum(r["systolic"] for r in hist[-7:]) / 7
        out[pid] = [Point((AS_OF + timedelta(days=i)).isoformat(), round(last + slope * i, 1),
                          round(last + slope * i - 6, 1), round(last + slope * i + 6, 1)) for i in range(1, HORIZON + 1)]
    return out, {"kind": STAND_IN, "jobId": None, "location": None, "sql": None}


def as_dicts(points: list[Point]) -> list[dict]:
    return [asdict(p) for p in points]
