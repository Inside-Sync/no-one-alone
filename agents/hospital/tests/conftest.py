import copy
import json
import socket
import sys
import threading
import time
from pathlib import Path

import pytest
import uvicorn

HERE = Path(__file__).parent
ROOT = HERE.parent
BUNDLE = ROOT / "data" / "fhir" / "ba-mai.json"
sys.path.insert(0, str(ROOT))
sys.path.insert(1, str(ROOT.parent / "respond"))


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


@pytest.fixture(scope="session")
def server_url(monkeypatch_module):
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    url = f"http://127.0.0.1:{port}"
    monkeypatch_module.setenv("A2A_PUBLIC_URL", url)
    import importlib

    import main
    importlib.reload(main)  # picks up A2A_PUBLIC_URL for the card
    server = uvicorn.Server(uvicorn.Config(main.app, host="127.0.0.1", port=port, log_level="warning"))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    deadline = time.time() + 15
    while not server.started:
        assert time.time() < deadline, "server did not start"
        time.sleep(0.05)
    yield url
    server.should_exit = True
    thread.join(5)


@pytest.fixture(scope="session")
def monkeypatch_module():
    mp = pytest.MonkeyPatch()
    yield mp
    mp.undo()
