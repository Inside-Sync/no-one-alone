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
| `scripts/hospital_client.py` | Client for respond-agent's `/handoff`: A2A with an identity token, HTTP fallback, contract 4.3 reply |
| `scripts/probe_a2a.py` | Low-level A2A probe (data, text or HTTP part) |

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
.venv/bin/python scripts/hospital_client.py --url http://localhost:8082 --no-auth   # respond-agent's call
```

## Environment

| Variable | Default | Notes |
|---|---|---|
| `A2A_PUBLIC_URL` | `http://localhost:$PORT` | Must be the Cloud Run service URL in the cloud |
| `FHIR_SOURCE` | `fixture` | `live` (Cloud Healthcare API) arrives in S3 |
| `FHIR_FIXTURE_DIR` | data/fhir (inside agents/hospital) | One bundle per personId |

## Calling it from respond-agent

Copy `scripts/hospital_client.py` into `agents/respond/` and add `a2a-sdk==1.2.2` to its `requirements.txt`
(1.x is not wire compatible with 0.3.x; it brings httpx, protobuf and google-auth). Then:

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
