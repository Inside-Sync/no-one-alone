"""Read-only access to a person's FHIR R4 record.

A reader returns the resources Patient/{id}/$everything would return: the Patient plus every resource
that points at it. An empty list means the Patient does not exist. RecordUnavailable means the store
could not be read. The live Cloud Healthcare reader arrives in S3; FHIR_SOURCE=fixture is the default.
"""
import json
import os
import re
from pathlib import Path
from typing import Protocol

DEFAULT_DIR = Path(__file__).resolve().parent.parent / "data" / "fhir"
PERSON_ID = re.compile(r"[a-z0-9]+(-[a-z0-9]+)*")


class RecordUnavailable(Exception):
    """The record store could not be read. The message never contains record content."""


class RecordReader(Protocol):
    async def read(self, person_id: str) -> list[dict]: ...


class FixtureReader:
    """Reads `{personId}.json` transaction Bundles from a directory as if it were the FHIR store."""

    def __init__(self, directory: Path | str = DEFAULT_DIR):
        self.directory = Path(directory)

    async def read(self, person_id: str) -> list[dict]:
        if not PERSON_ID.fullmatch(person_id or ""):
            return []
        path = self.directory / f"{person_id}.json"
        if not path.is_file():
            return []
        try:
            bundle = json.loads(path.read_text(encoding="utf-8"))
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
        return FixtureReader(os.environ.get("FHIR_FIXTURE_DIR", DEFAULT_DIR))
    raise RuntimeError(f"FHIR_SOURCE={source!r} is not supported yet")
