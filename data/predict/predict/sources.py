"""Read-only inputs: hospital-agent's synthetic FHIR bundles and core-api's seed. Nothing here writes."""
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
FHIR_DIR = REPO / "agents" / "hospital" / "data" / "fhir"
SEED = REPO / "core-api" / "src" / "main" / "resources" / "data" / "seed.json"
PERSON_ID = re.compile(r"[a-z0-9]+(-[a-z0-9]+)*")  # same guard as agents/hospital/handoff/fhir.py
PEOPLE = ("margaret", "ba-mai")


def load_bundle(person_id: str) -> list[dict]:
    """The resources of `{personId}.json`; raises ValueError for an id that is not kebab-case."""
    if not PERSON_ID.fullmatch(person_id or ""):
        raise ValueError("personId must be kebab-case")
    bundle = json.loads((FHIR_DIR / f"{person_id}.json").read_text(encoding="utf-8"))
    return [e["resource"] for e in bundle.get("entry", [])]


def load_seed() -> dict:
    return json.loads(SEED.read_text(encoding="utf-8"))
