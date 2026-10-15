# hospital-agent

Builds the pre-arrival packet for the receiving emergency department (docs/contract.md 4.4). Owner: Minh.

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
| `handoff/record.py` | FHIR resources to facts with source references |
| `handoff/consent.py` | Fail-closed hospital-sharing consent |
| `handoff/packet.py` | Packet and text |
| `handoff/pipeline.py` | Orchestration, error mapping, one log line per request without patient data |
| `scripts/probe_a2a.py` | Real A2A client; reference for respond-agent's caller |

Packet fields, consent policy and text format: [docs/contract.md](../../docs/contract.md) section 4.4.

## Run and test

```
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
.venv/bin/pytest -q
A2A_PUBLIC_URL=http://localhost:8082 .venv/bin/uvicorn main:app --port 8082
.venv/bin/python scripts/probe_a2a.py --url http://localhost:8082              # A2A, data part
.venv/bin/python scripts/probe_a2a.py --url http://localhost:8082 --mode text  # A2A, JSON text part
.venv/bin/python scripts/probe_a2a.py --url http://localhost:8082 --mode http  # HTTP fallback
```

## Environment

| Variable | Default | Notes |
|---|---|---|
| `A2A_PUBLIC_URL` | `http://localhost:$PORT` | Must be the Cloud Run service URL in the cloud |
| `FHIR_SOURCE` | `fixture` | `live` (Cloud Healthcare API) arrives in S3 |
| `FHIR_FIXTURE_DIR` | data/fhir (inside agents/hospital) | One bundle per personId |

## Calling it from respond-agent

```python
import google.auth.transport.requests, google.oauth2.id_token
token = google.oauth2.id_token.fetch_id_token(google.auth.transport.requests.Request(), HOSPITAL_AGENT_URL)
result = await call(HOSPITAL_AGENT_URL, body, token=token)   # see scripts/probe_a2a.py
packet = result["result"]                                    # or {"error": {...}}
```

Use a 20 s timeout. Pin the same `google-adk[a2a]` and `a2a-sdk` versions as `requirements.txt`.
