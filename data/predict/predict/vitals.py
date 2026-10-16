"""Deterministic synthetic daily vitals, 90 days per person (story day -26 to day 63). Synthetic demo data only.

Story day 0 is 2026-08-14 and day 21 (2026-09-04) is the forecast date (contract 2.4). Days 22 to 63 are stored
in BigQuery as the later trend but are never model input: `history()` cuts at day 21.
"""
import random
from dataclasses import dataclass, field
from datetime import date, timedelta

DAY0 = date(2026, 8, 14)
AS_OF_DAY = 21
AS_OF = DAY0 + timedelta(days=AS_OF_DAY)
FIRST_DAY, LAST_DAY = -26, 63
DAYS = range(FIRST_DAY, LAST_DAY + 1)
COLUMNS = ("person_id", "date", "systolic", "diastolic", "resting_hr", "steps", "meds_taken", "meds_scheduled")


@dataclass(frozen=True)
class Profile:
    base_systolic: float
    rise_from_day: int          # systolic starts drifting up after this day
    slope_to_as_of: float       # mmHg per day until day 21
    slope_after: float          # mmHg per day after day 21 (story only, never model input)
    resting_hr: int             # seed baseline
    steps: int
    tracked_meds: tuple[str, ...]  # daily medicines counted in meds_scheduled, named as in the FHIR MedicationStatements
    missed: dict[int, int] = field(default_factory=dict)   # story day -> doses missed

    @property
    def meds_scheduled(self) -> int:
        return len(self.tracked_meds)


# Margaret: one evening amlodipine; Bà Mai: amlodipine and aspirin daily (FHIR). 3 missed doses in days 15-21.
PROFILES = {
    "margaret": Profile(129.0, -14, 0.47, 0.32, 63, 3600, ("amlodipine",),
                        {2: 1, 9: 1, 12: 1, 16: 1, 18: 1, 20: 1, 25: 1, 29: 1, 33: 1, 38: 1, 44: 1, 51: 1, 58: 1}),
    "ba-mai": Profile(131.0, -14, 0.44, 0.30, 64, 2900, ("amlodipine", "aspirin"),
                      {4: 1, 10: 1, 13: 1, 15: 1, 17: 1, 21: 1, 26: 1, 31: 1, 37: 1, 43: 1, 50: 1, 57: 1}),
}


def day_of(d: date) -> int:
    return (d - DAY0).days


def _systolic_trend(p: Profile, day: int) -> float:
    rise = max(0, min(day, AS_OF_DAY) - p.rise_from_day) * p.slope_to_as_of
    return p.base_systolic + rise + max(0, day - AS_OF_DAY) * p.slope_after


def generate(person_id: str) -> list[dict]:
    """90 rows, one per day, in date order. Same input, same rows."""
    p = PROFILES[person_id]
    rng = random.Random(f"{person_id}-vitals-v1")
    rows = []
    for day in DAYS:
        systolic = round(_systolic_trend(p, day) + rng.uniform(-2, 2))
        missed = p.missed.get(day, 0)
        rows.append({
            "person_id": person_id,
            "date": (DAY0 + timedelta(days=day)).isoformat(),
            "systolic": systolic,
            "diastolic": round(systolic * 0.56 + 8 + rng.uniform(-2, 2)),
            "resting_hr": round(p.resting_hr + rng.uniform(-2, 2) + (1 if missed else 0)),
            "steps": round(p.steps + rng.uniform(-400, 400)),
            "meds_taken": p.meds_scheduled - missed,
            "meds_scheduled": p.meds_scheduled,
        })
    return rows


def history(rows: list[dict], as_of: date = AS_OF) -> list[dict]:
    """Rows up to and including the forecast date: the only data the model may see."""
    return [r for r in rows if date.fromisoformat(r["date"]) <= as_of]


def window(rows: list[dict], first_day: int, last_day: int) -> list[dict]:
    return [r for r in rows if first_day <= day_of(date.fromisoformat(r["date"])) <= last_day]


def mean(rows: list[dict], key: str) -> float:
    return sum(r[key] for r in rows) / len(rows)
