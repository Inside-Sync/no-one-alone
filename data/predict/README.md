# data/predict: family screening (and, next, the day-21 forecast)

One-off jobs that write `families/{personId}` (contract 2.5) and, later, `forecasts/{personId}` (2.4) to Firestore
for the web to read. Owners: Minh, Dũng. All people and records are synthetic. Nothing here is deployed: the jobs
run once from a laptop with Application Default Credentials.

## Family screening

`families/{personId}` for `margaret` and `ba-mai`:

- Medical history comes only from the synthetic FHIR bundles in `agents/hospital/data/fhir/` (FamilyMemberHistory and
  confirmed, active Conditions). Provisional conditions stay out of the tree.
- Relationships come only from the core-api seed (`circle`). Neighbours are not family.
- A relative without a documented name keeps a relation label ("Father"). The one documented name is Bà Mai's
  father, "Ông Tư" (contract 2.5).
- Flags are rules, not diagnoses. A parent or grandparent with stroke or hypertension: blood pressure check.
  Type 2 diabetes in a grandparent or prediabetes in a parent: blood sugar test. The reason lists only documented
  facts.
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

## CI

CI runs the tests in `agents/respond` and `agents/hospital` only. Until it covers this folder, every PR here carries
the local `pytest` output. Request for Dũng: a CI step with `working-directory: data/predict` that installs
`requirements.txt` and `requirements-dev.txt` and runs `python -m pytest -q`. `data/` is outside the Deploy path
filters, so merging here deploys nothing.
