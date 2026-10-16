"""BigQuery load for noa.vitals_daily: staging table, conflict check, insert-only MERGE, read-back.

Never truncates, deletes from or drops vitals_daily. Only our (person_id, date) keys are inserted; an existing row
for one of those keys that differs from ours aborts the load before anything is merged.
"""
from .sources import PERSON_ID
from .vitals import COLUMNS

PROJECT, DATASET, LOCATION = "no-one-alone-511616", "noa", "asia-southeast1"
TABLE = f"{PROJECT}.{DATASET}.vitals_daily"
STAGING = f"{PROJECT}.{DATASET}.vitals_daily_staging_pr2"
SCHEMA = [("person_id", "STRING"), ("date", "DATE"), ("systolic", "INT64"), ("diastolic", "INT64"),
          ("resting_hr", "INT64"), ("steps", "INT64"), ("meds_taken", "INT64"), ("meds_scheduled", "INT64")]
assert tuple(n for n, _ in SCHEMA) == COLUMNS


class LoadAborted(Exception):
    """The load stopped before MERGE; vitals_daily is unchanged."""


def _ids(people) -> str:
    for p in people:
        if not PERSON_ID.fullmatch(p):
            raise ValueError("personId must be kebab-case")
    return ", ".join(f"'{p}'" for p in people)


def create_table_sql() -> str:
    cols = ", ".join(f"{n} {t}" for n, t in SCHEMA)
    return (f"CREATE TABLE IF NOT EXISTS `{TABLE}` ({cols}) "
            "OPTIONS (description = 'SYNTHETIC demo data for No One Alone: generated daily vitals, not real people')")


def conflict_sql() -> str:
    differs = " OR ".join(f"T.{c} IS DISTINCT FROM S.{c}" for c in COLUMNS if c not in ("person_id", "date"))
    return (f"SELECT COUNT(*) AS conflicts FROM `{TABLE}` T JOIN `{STAGING}` S USING (person_id, date) "
            f"WHERE {differs}")


def merge_sql() -> str:
    cols = ", ".join(COLUMNS)
    values = ", ".join(f"S.{c}" for c in COLUMNS)
    return (f"MERGE `{TABLE}` T USING `{STAGING}` S ON T.person_id = S.person_id AND T.date = S.date "
            f"WHEN NOT MATCHED THEN INSERT ({cols}) VALUES ({values})")


def drop_staging_sql() -> str:
    return f"DROP TABLE IF EXISTS `{STAGING}`"


def readback_sql(people) -> str:
    return (f"SELECT person_id, COUNT(*) AS n, MIN(date) AS first, MAX(date) AS last FROM `{TABLE}` "
            f"WHERE person_id IN ({_ids(people)}) GROUP BY person_id ORDER BY person_id")


def _load_config():
    from google.cloud import bigquery
    return bigquery.LoadJobConfig(schema=[bigquery.SchemaField(n, t) for n, t in SCHEMA],
                                  write_disposition="WRITE_TRUNCATE")  # the staging table only


def _scalar(job) -> int:
    return int(list(job.result())[0][0])


def load_scoped(client, rows: list[dict], *, write: bool = False) -> dict:
    """Dry run unless write=True. Returns the steps (dry run) or the inserted count and read-back."""
    people = sorted({r["person_id"] for r in rows})
    _ids(people)
    steps = [create_table_sql(), f"LOAD {len(rows)} rows INTO `{STAGING}` (staging only)", conflict_sql(),
             merge_sql(), drop_staging_sql(), readback_sql(people)]
    if not write:
        return {"dryRun": True, "rows": len(rows), "people": people, "steps": steps}
    if _exists(client, STAGING):
        raise LoadAborted(f"{STAGING} already exists and is not ours to replace; nothing was loaded")
    jobs = []

    def run(step, sql):
        job = client.query(sql, location=LOCATION)
        jobs.append((step, job.job_id))
        return job

    run("create", create_table_sql()).result()
    try:
        load = client.load_table_from_json(rows, STAGING, job_config=_load_config(), location=LOCATION)
        jobs.append(("load-staging", load.job_id))
        load.result()
        conflicts = _scalar(run("conflict-check", conflict_sql()))
        if conflicts:
            raise LoadAborted(f"{conflicts} existing rows differ from ours for the same person and date; "
                              "nothing was merged")
        merge = run("merge", merge_sql())
        merge.result()
        inserted = merge.num_dml_affected_rows
    finally:
        run("drop-staging", drop_staging_sql()).result()
    readback = [dict(r.items()) for r in run("readback", readback_sql(people)).result()]
    return {"dryRun": False, "rows": len(rows), "inserted": inserted, "readback": readback, "jobs": jobs}


def _exists(client, table_id: str) -> bool:
    from google.api_core.exceptions import NotFound
    try:
        client.get_table(table_id)
        return True
    except NotFound:
        return False


def bigquery_client(project: str = PROJECT):
    from google.cloud import bigquery
    return bigquery.Client(project=project, location=LOCATION)
