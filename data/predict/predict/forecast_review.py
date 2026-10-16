"""Reviewed forecast output: save what a real AI.FORECAST run produced, and re-check a saved file before writing."""
import copy
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from . import forecast_doc, sources, vitals
from .contract import check_forecast_doc
from .forecast import BIGQUERY, Point, check

KIND = "forecasts-review"
JOB_ID = re.compile(r"[A-Za-z0-9_-]{8,1024}")


def sha256(path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def save(path, outs: dict[str, dict], source: dict, *, project: str, model: str | None, extra: dict | None = None) -> str:
    path = Path(path)
    if path.resolve().is_relative_to(sources.REPO.resolve()):
        raise ValueError("review files must be saved outside the repository")
    if source.get("kind") != BIGQUERY:
        raise ValueError("only a real BigQuery AI.FORECAST result can be saved for review")
    payload = {"kind": KIND, "version": 1, "project": project, "model": model, "source": source,
               "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
               "documents": [{"personId": pid, "path": f"forecasts/{pid}", "doc": out["doc"],
                              "driversFromModel": out["driversFromModel"]} for pid, out in outs.items()],
               **(extra or {})}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return sha256(path)


def _points(doc: dict) -> list[Point]:
    return [Point(p["date"], p["systolicForecast"], p["lower"], p["upper"]) for p in doc["series"]
            if "systolicForecast" in p]


def verify(entry: dict, seed: dict) -> list[str]:
    pid = entry.get("personId")
    if pid not in sources.PEOPLE:
        return [f"unknown personId {pid!r}"]
    if entry.get("path") != f"forecasts/{pid}":
        return [f"{pid}: path must be forecasts/{pid}, got {entry.get('path')!r}"]
    doc = entry.get("doc")
    if problems := [f"{pid}: {p}" for p in check_forecast_doc(doc)]:
        return problems
    shown = json.dumps(doc)
    if "%" in shown or re.search(r"probab|percent", shown, re.I):
        return [f"{pid}: the document must not contain percentages or probabilities"]
    rows = vitals.generate(pid)
    points = _points(doc)
    if problems := check(points):
        return [f"{pid}: {p}" for p in problems]
    if [p for p in doc["series"] if "systolic" in p] != forecast_doc.series(rows, []):
        return [f"{pid}: observed series differs from the synthetic history up to day {vitals.AS_OF_DAY}"]
    expected = forecast_doc.build(pid, rows, points, sources.load_bundle(pid), seed)
    exp = expected["doc"]
    for key in ("asOf", "storyDay", "method", "risks", "action", "series"):
        if doc.get(key) != exp.get(key):
            return [f"{pid}: {key} differs from what the rules give for this forecast"]
    if len(doc["drivers"]) != 3:
        return [f"{pid}: exactly three drivers (trend, pill, tree)"]
    chosen, _ = forecast_doc.choose_drivers(expected["facts"], doc["drivers"])
    if chosen != doc["drivers"]:
        return [f"{pid}: a driver is not grounded in its facts"]
    return []


def load(path, seed: dict) -> tuple[dict, list[dict], list[str]]:
    """(source, entries, problems). Entries are usable only when problems is empty."""
    try:
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        return {}, [], [f"cannot read review file: {type(e).__name__}"]
    if not isinstance(payload, dict) or payload.get("kind") != KIND or payload.get("version") != 1:
        return {}, [], ["not a forecasts review file (kind/version)"]
    source = payload.get("source") or {}
    if source.get("kind") != BIGQUERY or not JOB_ID.fullmatch(str(source.get("jobId") or "")):
        return source, [], ["forecast did not come from a BigQuery AI.FORECAST job (local stand-in results are never written)"]
    if "AI.FORECAST" not in (source.get("sql") or "") or f"date <= DATE '{vitals.AS_OF.isoformat()}'" not in source["sql"]:
        return source, [], ["recorded SQL is not the AI.FORECAST query with the story-day-21 cutoff"]
    entries = payload.get("documents") or []
    ids = [e.get("personId") for e in entries if isinstance(e, dict)]
    if len(ids) != len(entries) or len(set(ids)) != len(ids):
        return source, [], ["each person may appear once"]
    return source, entries, [p for e in entries for p in verify(copy.deepcopy(e), seed)]


def job_problems(client, source: dict, entries: list[dict] | None = None) -> list[str]:
    """The recorded job exists, finished as an AI.FORECAST query, and (with entries) its stored results equal the file.

    Uses jobs.get and the finished job's own results: no new query and no new forecast is run.
    """
    from .forecast import ForecastInvalid, parse
    try:
        job = client.get_job(source["jobId"], location=source.get("location"))
    except Exception as e:
        return [f"BigQuery job {source['jobId']} not found: {type(e).__name__}"]
    problems = []
    if getattr(job, "state", None) != "DONE" or getattr(job, "error_result", None):
        problems.append(f"BigQuery job {source['jobId']} did not finish successfully")
    if "AI.FORECAST" not in (getattr(job, "query", "") or ""):
        problems.append(f"BigQuery job {source['jobId']} is not an AI.FORECAST query")
    if problems or not entries:
        return problems
    people = [e["personId"] for e in entries]
    try:
        actual = parse([dict(r.items()) for r in job.result()], people)
    except (ForecastInvalid, Exception) as e:
        return [f"cannot read the results of BigQuery job {source['jobId']}: {type(e).__name__}"]
    for e in entries:
        if _points(e["doc"]) != actual[e["personId"]]:
            problems.append(f"{e['personId']}: forecast points differ from the results of job {source['jobId']}")
    return problems
