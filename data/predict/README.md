# data/predict: family screening and the day-21 forecast

One-off jobs that write `families/{personId}` (contract 2.5) and, later, `forecasts/{personId}` (2.4) to Firestore
for the web to read. All people and records are synthetic. Nothing here is deployed: the jobs
run once from a laptop with Application Default Credentials.

## Family screening

`families/{personId}` for `margaret` (Moza Al Hammadi):

- Medical history comes only from the synthetic FHIR bundles in `agents/hospital/data/fhir/` (FamilyMemberHistory and
  confirmed, active Conditions). Provisional conditions stay out of the tree.
- The tree comes from FHIR FamilyMemberHistory: parents (generation 0), husband, brother and herself (1), children (2) and
  grandchildren (3), with name, `age` or `deceasedAge`, `place` (residence extension) and each condition's onset age and
  note. Relatives that are in the core-api seed circle keep their circle id (`margaret-brother` is `david`, `margaret-son`
  is `james`, `margaret-daughter` is `sarah`). Her own age comes from the Patient (the bundles carry a stated age, no birth
  date) and her place from `address.district`.
- Blood relatives in the seed (`circle`) with no FHIR record are still added without age or conditions. Neighbours are not
  family. A relative without a name in FHIR keeps a relation label ("Father").
- Each condition carries a stable `code` next to its `label` (`STROKE`, `HYPERTENSION`, `TYPE_2_DIABETES` ...), from
  the SNOMED code or the label's words; a condition in neither list has no `code`. The web reads `code`, not the words.
- Flags are rules, not diagnoses, for her siblings and children. A parent (a child also counts the other parent and
  the grandparents) with stroke or hypertension: blood pressure check. Type 2 diabetes or prediabetes in a parent or
  grandparent: blood sugar test. The reason lists only documented facts. Grandchildren get no flags.
- Gemini (Vertex AI, temperature 0) may add an optional `explanation`. Text that uses a number, relative or
  condition not in the facts, or gives a probability or diagnosis, is dropped.

## Run

```
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
.venv/bin/python -m pytest -q
.venv/bin/python -m predict.run family --person all --show          # dry run: prints, writes nothing
gcloud auth application-default login                                # once, for the steps below
.venv/bin/python -m predict.run family --person all --gemini --show  # dry run with Gemini explanations
.venv/bin/python -m predict.run family --person all --gemini --write # writes Firestore (approved runs only)
```

A write replaces each whole document, so running it twice gives the same result. The job writes only `families`
and `forecasts`; core-api's demo reset does not touch them.

## AI Predict: the day-21 forecast

`forecasts/{personId}` for `margaret`:

- `vitals.py` generates 90 days of synthetic daily vitals per person (story day -26 to 63, 2026-07-19 to 2026-10-16),
  deterministic from a fixed seed, in the contract 5 `vitals_daily` schema. Systolic pressure drifts up after day
  -14 while doses are missed; the tracked medicines are the person's FHIR MedicationStatements.
- `vitals --write-bq` loads them into `noa.vitals_daily` through a staging table: a conflict check aborts if any
  existing row for one of our (person, date) keys differs, and an insert-only MERGE never updates or deletes rows.
  The staging table is always dropped. This command never touches Firestore.
- `forecast --bq-forecast` runs one BigQuery `AI.FORECAST` (TimesFM) query on systolic pressure, 30 days ahead.
  Model input is only the 48 days up to story day 21 (2026-09-04); later days stay in BigQuery and are never input.
- The stroke level (HIGH, MEDIUM, LOW, 90-day horizon) is a demo rule over the forecast upper bound, 7-day adherence
  and documented parent stroke. It is not a clinical probability, and no percentage is stored.
- The three drivers (trend, missed doses, family history) are computed facts; Gemini may phrase them, and any
  phrasing that adds numbers, relatives, conditions, risk or probability is replaced by fixed text. The action
  (pill box by the first NEARBY family member) is a rule.
- Only a real AI.FORECAST result can be saved with `--out`; `--from --write` re-checks the file, confirms the
  BigQuery job finished as an AI.FORECAST query (job metadata only), and writes Firestore. The local stand-in that
  dry runs use is labelled and can never be saved or written.

```
.venv/bin/python -m predict.run vitals                       # dry run: rows and SQL
.venv/bin/python -m predict.run vitals --write-bq            # BigQuery only (approved runs)
.venv/bin/python -m predict.run forecast                     # dry run on the local stand-in
.venv/bin/python -m predict.run forecast --bq-forecast --gemini --out /tmp/forecasts.review.json
.venv/bin/python -m predict.run forecast --from /tmp/forecasts.review.json --write   # Firestore only (approved runs)
```

