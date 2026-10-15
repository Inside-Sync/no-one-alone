"""Read-only access to a person's FHIR R4 record.

A reader returns the resources Patient/{id}/$everything would return: the Patient plus every resource
that points at it. An empty list means the Patient does not exist. RecordUnavailable means the store
could not be read. The live Cloud Healthcare reader arrives in S3; FHIR_SOURCE=fixture is the default.
"""
import json
import os
from pathlib import Path
from typing import Protocol

# Repo layout: agents/hospital/handoff/fhir.py -> data/fhir. In the Docker image the file is absent
# (.parent stops at /, unlike parents[n]), so fixture mode answers PARTIAL there.
DEFAULT_FIXTURE = Path(__file__).resolve().parent.parent.parent.parent / "data" / "fhir" / "ba-mai.json"


class RecordUnavailable(Exception):
    """The record store could not be read. The message never contains record content."""


class RecordReader(Protocol):
    async def read(self, person_id: str) -> list[dict]: ...


class FixtureReader:
    """Reads a transaction Bundle from disk (data/fhir/ba-mai.json) as if it were the FHIR store."""

    def __init__(self, path: Path | str = DEFAULT_FIXTURE):
        self.path = Path(path)

    async def read(self, person_id: str) -> list[dict]:
        try:
            bundle = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as e:
            raise RecordUnavailable(f"fixture unreadable: {type(e).__name__}") from None
        resources = [e["resource"] for e in bundle.get("entry", [])]
        patient_ref = f"Patient/{person_id}"
        if not any(r["resourceType"] == "Patient" and r.get("id") == person_id for r in resources):
            return []
        return [r for r in resources
                if f'{r["resourceType"]}/{r.get("id")}' == patient_ref
                or any((r.get(k) or {}).get("reference") == patient_ref for k in ("subject", "patient"))]


def default_reader() -> RecordReader:
    source = os.environ.get("FHIR_SOURCE", "fixture")
    if source == "fixture":
        return FixtureReader(os.environ.get("FHIR_FIXTURE", DEFAULT_FIXTURE))
    raise RuntimeError(f"FHIR_SOURCE={source!r} is not supported yet")
