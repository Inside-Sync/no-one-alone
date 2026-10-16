"""Demo-only stroke risk level from the BP forecast, adherence and documented family history."""
UPPER_LIMIT = 150     # mmHg, forecast upper bound within 30 days
ADHERENCE_LIMIT = 0.8


def classify(forecast_upper_max: float, adherence_7d: float, parent_stroke: bool) -> list[dict]:
    bp = forecast_upper_max > UPPER_LIMIT
    other = adherence_7d < ADHERENCE_LIMIT or parent_stroke
    level = "HIGH" if bp and other else "MEDIUM" if bp or other else "LOW"
    return [{"condition": "STROKE", "horizonDays": 90, "level": level}]
