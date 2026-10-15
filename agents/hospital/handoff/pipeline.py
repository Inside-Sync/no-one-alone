"""Handoff pipeline shared by the A2A agent and the HTTP fallback.

validate -> read FHIR record -> normalize -> consent -> build packet. Stateless; reads only.
Logs one line per request with IDs, status, counts and timing: never names or clinical values.
"""
import json
import logging
import time
from datetime import datetime, timezone

from pydantic import ValidationError

from . import consent, packet
from .contracts import ErrorBody, HandoffPacket, HandoffRequest
from .fhir import RecordReader, RecordUnavailable, default_reader
from .record import normalize

log = logging.getLogger("hospital_agent")
_reader: RecordReader | None = None


def _default() -> RecordReader:
    global _reader
    if _reader is None:
        _reader = default_reader()
    return _reader


async def run(req: HandoffRequest, *, reader: RecordReader, now: datetime) -> HandoffPacket:
    try:
        resources = await reader.read(req.person_id)
    except RecordUnavailable:
        return packet.build(req, None, None, "PARTIAL", ["RECORD_UNAVAILABLE"])
    if not resources:
        return packet.build(req, None, None, "PARTIAL", ["PATIENT_NOT_FOUND"])
    # Age is computed for the day of the emergency when known, so replays give the same packet.
    on = datetime.fromisoformat(req.last_known_well_at).date() if req.last_known_well_at else now.date()
    record = normalize(resources, req.person_id, on)
    decision = consent.decide(record.consents, req.person_id, now)
    return packet.build(req, record, decision, "BLOCKED_CONSENT" if decision.blocked else "COMPLETED", [])


async def handle(body: object, *, reader: RecordReader | None = None, now: datetime | None = None) -> tuple[int, dict]:
    """Returns (HTTP status, JSON body). The A2A agent ignores the status and sends the body as text."""
    t0 = time.perf_counter()
    try:
        req = HandoffRequest.model_validate(body)
    except ValidationError as e:
        log.warning(json.dumps({"stage": "validate", "status": "INVALID_REQUEST"}))
        return 400, ErrorBody.of("INVALID_REQUEST", _summary(e)).to_json()
    try:
        result = await run(req, reader=reader or _default(), now=now or datetime.now(timezone.utc))
    except Exception as e:  # noqa: BLE001 - one bad request must not take the agent down
        log.error(json.dumps({"stage": "handoff", "incidentId": req.incident_id, "status": "AGENT_FAILED",
                              "error": type(e).__name__}))
        return 502, ErrorBody.of("AGENT_FAILED", "hospital-agent could not build the packet").to_json()
    log.info(json.dumps({"stage": "handoff", "incidentId": req.incident_id, "status": result.status,
                         "withheld": len(result.withheld), "warnings": result.warnings, "sources": len(result.sources),
                         "ms": round((time.perf_counter() - t0) * 1000)}))
    return 200, result.to_json()


def _summary(e: ValidationError) -> str:
    # Field paths and error types only; never echo input values, which may hold patient data.
    return "; ".join(f'{".".join(map(str, err["loc"])) or "body"}: {err["type"]}' for err in e.errors())
