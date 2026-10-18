# hospital-agent

Builds the pre-arrival packet for the receiving emergency department.

One deterministic ADK `BaseAgent` (no LLM planning) served over A2A by `to_a2a`, plus a plain-HTTP fallback
on the same pipeline. Hospital choice and ETA come from core-api in the request; this agent does not pick
hospitals, write Firestore, write FHIR or claim delivery.

```
request ─ validate ─ read FHIR record ─ normalize ─ consent ─ packet (+ text) ─ reply
```

| File | Role |
|---|---|
| `main.py` | Starlette app: A2A (`POST /`, `/.well-known/agent-card.json`), `POST /handoff`, `GET /health` |
| `agent.py` | `HospitalAgent`: reads the data or text part, runs the pipeline, replies with JSON text |
| `handoff/contracts.py` | Request, packet and error shapes |
| `handoff/fhir.py` | Record readers. `FHIR_SOURCE=fixture` (default) reads `data/fhir/{personId}.json` inside the service |
| `handoff/live.py` | `FHIR_SOURCE=live`: reads the Cloud Healthcare FHIR store over ADC, read-only |
| `handoff/record.py` | FHIR resources to facts with source references |
| `handoff/consent.py` | Fail-closed hospital-sharing consent |
| `handoff/packet.py` | Packet and text |
| `handoff/pipeline.py` | Orchestration, error mapping, one log line per request without patient data |
| `../respond/hospital_client.py` | Client for respond-agent's `/handoff`: A2A with an identity token, HTTP fallback, contract 4.3 reply |
| `scripts/probe_a2a.py` | Low-level A2A probe (data, text or HTTP part) |
| `scripts/load_fhir.py` | Loads `data/fhir` into the FHIR store: dry run by default, `--write`, `--verify` |

Packet fields and consent policy: `handoff/contracts.py` and `handoff/consent.py`.

## Run and test

```
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
.venv/bin/pytest -q
A2A_PUBLIC_URL=http://localhost:8082 .venv/bin/uvicorn main:app --port 8082
.venv/bin/python scripts/probe_a2a.py --url http://localhost:8082              # A2A, data part
.venv/bin/python scripts/probe_a2a.py --url http://localhost:8082 --mode text  # A2A, JSON text part
.venv/bin/python scripts/probe_a2a.py --url http://localhost:8082 --mode http  # HTTP fallback
.venv/bin/python ../respond/hospital_client.py --url http://localhost:8082 --no-auth --request tests/fixtures/request.stroke.json   # respond-agent's call
```

## Environment

| Variable | Default | Notes |
|---|---|---|
| `A2A_PUBLIC_URL` | `http://localhost:$PORT` | Must be the Cloud Run service URL in the cloud |
| `FHIR_SOURCE` | `fixture` | `fixture` or `live`. Anything else stops the service at startup |
| `FHIR_FIXTURE_DIR` | data/fhir (inside agents/hospital) | One bundle per personId (fixture mode) |
| `FHIR_STORE` | none | Live mode, required: `projects/{p}/locations/{l}/datasets/{d}/fhirStores/{s}` |
| `FHIR_API_BASE` | `https://healthcare.googleapis.com/v1` | Live mode. https only (plain http to localhost for an emulator) |

## Live FHIR (`FHIR_SOURCE=live`)

The store for the demo is `projects/no-one-alone-511616/locations/asia-southeast1/datasets/noa/fhirStores/records`.
Production runs in fixture mode until the team approves the switch.

- **Reads:** `Patient/{personId}`, then one search per type with `patient=Patient/{personId}`: Condition,
  MedicationStatement, AllergyIntolerance, FamilyMemberHistory and Consent. Paging links are followed only
  inside the store, up to 10 pages per type. It does not use `Patient/$everything`, which the
  `roles/healthcare.fhirResourceReader` role on the `hospital-agent` service account does not grant.
- **Auth:** Application Default Credentials: the Cloud Run service account, or `gcloud auth
  application-default login` locally. `fhirResources.get` and `fhirStores.searchResources` are enough.
- **All or nothing:** any non-200 reply, timeout (6 s for the whole read), unreadable reply, search error
  or credentials failure gives `PARTIAL` with `RECORD_UNAVAILABLE` and no record fields. That includes a
  failed Consent search when the other searches worked. Live mode never reads the bundled fixtures.
  An unknown Patient gives `PATIENT_NOT_FOUND`. Consent is enforced as in fixture mode (fail closed).
- **Startup:** `main.py` checks `FHIR_SOURCE`, `FHIR_STORE` and `FHIR_API_BASE` at import, without network
  calls, so a misconfigured revision never becomes ready.
- **Logs:** one line `{"stage": "fhir", "source": "live", "error": ...}` per failed read, with the HTTP status
  or exception type only.

Loading the synthetic bundles (each cloud step needs approval; the store needs `enableUpdateCreate`
because every entry is a `PUT` with a fixed id):

```
.venv/bin/python scripts/load_fhir.py --store "$FHIR_STORE"            # dry run: CREATE / SAME / CONFLICT per resource
.venv/bin/python scripts/load_fhir.py --store "$FHIR_STORE" --write    # one transaction of the missing ones, then verify
.venv/bin/python scripts/load_fhir.py --store "$FHIR_STORE" --verify   # read-only: live and fixture give the same packets
```

It checks every bundle first: HTEST tag on every resource, ids that belong to the person, no `birthDate`,
every reference inside the bundle. A resource already in the store with different content aborts the
load before anything is written; one with the same content is skipped, so a rerun creates no new versions.

## Calling it from respond-agent

respond-agent's `/handoff` uses `agents/respond/hospital_client.py`:

```python
from hospital_client import send_handoff

@app.post("/handoff")
async def handoff(body: dict):
    return await send_handoff(os.environ["HOSPITAL_AGENT_URL"], body)
```

`send_handoff` never raises and returns the contract 4.3 reply:

| Outcome | Reply |
|---|---|
| hospital-agent returned a packet (`COMPLETED`, `PARTIAL` or `BLOCKED_CONSENT`) | `{"status": "RECEIVED", "packet": {...}, "fallback": false}`, packet unchanged |
| Same, but A2A failed and the HTTP fallback (`POST /handoff`) answered | `fallback: true` |
| Agent error (`INVALID_REQUEST`, `AGENT_FAILED`), malformed reply, both transports down, no token, timeout | `{"status": "FAILED", "fallback": ...}`, no `packet` |

`RECEIVED` means hospital-agent returned a packet, not that the hospital confirmed receipt. Agent errors are
not retried. One 20 s deadline covers the token, A2A (at most 60% of it while the fallback is on) and HTTP.
The identity token comes from `google.oauth2.id_token.fetch_id_token` for the service URL (service account or
Cloud Run metadata server); a personal gcloud login passes `--token "$(gcloud auth print-identity-token)"` to
the CLI instead. Each call logs one JSON line to stderr with codes and timings only.
