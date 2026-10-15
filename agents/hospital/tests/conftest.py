import copy
import json
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).parent
ROOT = HERE.parent
BUNDLE = ROOT / "data" / "fhir" / "ba-mai.json"
sys.path.insert(0, str(ROOT))


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.fixture
def request_body() -> dict:
    return load_json(HERE / "fixtures" / "request.stroke.json")


@pytest.fixture
def bundle() -> dict:
    return copy.deepcopy(load_json(BUNDLE))


@pytest.fixture
def resources(bundle) -> list[dict]:
    return [e["resource"] for e in bundle["entry"]]
