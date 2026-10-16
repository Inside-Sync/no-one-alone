# respond-agent forwards /handoff to hospital-agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** respond-agent's `POST /handoff` calls hospital-agent through Minh's client, so core-api gets a real pre-arrival packet; Minh's client gets its review fixes.

**Architecture:** `hospital_client.py` moves from `agents/hospital/scripts/` to `agents/respond/`, its only production caller, so there is one copy. hospital-agent's client tests import it from there. respond-agent's `/handoff` becomes async and returns `send_handoff(HOSPITAL_AGENT_URL, body)`. CI runs pytest for both agents.

**Tech Stack:** Python 3.12, FastAPI 0.115, a2a-sdk 1.2.2, google-auth, httpx, pytest; GitHub Actions.

**Spec:** Approved by Dũng in chat on 16/10 ("sửa luôn đi rồi ship, sau đó làm luôn phần của Tài"), from the review of commit `30bd082` at `origin/dev` `f576d1c`. Contract: `docs/contract.md` 4.3 (respond-agent reads `HOSPITAL_AGENT_URL`, calls hospital-agent with an OIDC token, returns `{status: RECEIVED|FAILED, packet?, fallback}`), 4.4, 6.

## Global Constraints

- respond-agent's other routes (`/verify`, `/checkin/turn`, `/triage`, `/plan`) stay as they are. They are Tài's.
- `send_handoff` behaviour does not change. Only its location, its docstring and its tests' timing change.
- The `/handoff` reply follows contract 4.3: `status` is `RECEIVED` or `FAILED`; `packet` only with `RECEIVED`; `fallback` boolean.
- No secrets, no patient data in logs.
- Comments at most one short line; no banners, no comments that restate code.
- Docs: short plain sentences, no em-dashes.

## Review Focus

1. `HOSPITAL_AGENT_URL` unset (local dev, or respond deployed before the env step): `/handoff` returns `{"status": "FAILED", "fallback": false}` and does not raise. Test in Task 2.
2. hospital-agent unreachable or slow: the client returns `FAILED` within its 20 s deadline and respond-agent passes it through. Covered by the client's tests, which must stay green after the move (Task 1).
3. a2a-sdk 1.2.2 and fastapi 0.115.0 resolve together in one environment (respond's image). Checked by Task 2's install.
4. The hospital CI job still finds the client after the move (path from `agents/hospital` to `agents/respond`). Task 1.
5. Request body passes through unchanged (no FastAPI model that drops unknown fields). Test in Task 2.

## Working rules for implementers

- Worktree `C:\Users\PC\IdeaProjects\no-one-alone-respond`, branch `feat/respond-handoff` from `origin/dev` `f576d1c`. Use `git mv` where a step says so; otherwise do not `git add` or commit. The controller commits.
- Python venvs: `agents/hospital/.venv` and `agents/respond/.venv` (gitignored). Never install into system Python.
- Every new or changed test names a red edit. Apply it, run, paste the failing lines into `.superpowers/sdd/2026-10-16-respond-handoff/checks.md` under the task heading, revert, run green.

## File map

| File | Change | Task |
|---|---|---|
| `agents/hospital/scripts/hospital_client.py` -> `agents/respond/hospital_client.py` | `git mv`; one-line docstring; deps line | 1 |
| `agents/hospital/tests/conftest.py` | put `agents/respond` on `sys.path` | 1 |
| `agents/hospital/tests/test_client.py` | import from new place; timing fix; drop banners and multi-line docstrings | 1 |
| `agents/hospital/README.md` | client rows and usage point at `agents/respond/` | 1 |
| `.gitignore` | ignore `.superpowers/` | 1 |
| `agents/respond/requirements.txt`, `requirements-dev.txt`, `.dockerignore` | client deps; pytest; keep tests out of the image | 2 |
| `agents/respond/main.py` | async `/handoff` through the client | 2 |
| `agents/respond/tests/test_handoff.py` (+ `tests/__init__.py`, `pytest.ini`) | new | 2 |
| `.github/workflows/ci.yml` | run pytest for both agents | 2 |

Task 2 needs Task 1 (the file move).

---

### Task 1: Move the client and apply review fixes

**Files:**
- Move: `agents/hospital/scripts/hospital_client.py` -> `agents/respond/hospital_client.py` (`git mv`)
- Modify: `agents/hospital/tests/conftest.py`, `agents/hospital/tests/test_client.py`, `agents/hospital/README.md`, `.gitignore`

**Interfaces:**
- Produces: module `hospital_client` importable from `agents/respond`, with `send_handoff(url, body, *, auth=True, fallback_http=True, timeout=20.0, token_provider=None) -> dict` unchanged.

- [ ] **Step 1: Move**

```bash
git mv agents/hospital/scripts/hospital_client.py agents/respond/hospital_client.py
```

- [ ] **Step 2: Client docstring**

Replace the module docstring (lines 1-11) with one line:

```python
"""hospital-agent client for /handoff (contract 4.3, 4.4): A2A first, HTTP fallback. Needs a2a-sdk, google-auth, httpx, requests."""
```

Leave the CLI (`main()`) as is, but its `--request` default `tests/fixtures/request.stroke.json` no longer exists next to the file: make `--request` required. Cut any other multi-line comment in this file to one line (e.g. the log comment near the end).

- [ ] **Step 3: Test imports**

`agents/hospital/tests/test_client.py`: `from scripts import hospital_client as hc` becomes `import hospital_client as hc`. Update the module docstring to name `agents/respond/hospital_client.py`. Delete the `# --- ... ---` section banners and cut multi-line docstrings (e.g. `Calls`, `Proxy`) to one line.

`agents/hospital/tests/conftest.py`, after `sys.path.insert(0, str(ROOT))`, put `agents/respond` AFTER `ROOT` (index 1) so `import main` still resolves to hospital's `main.py`:

```python
sys.path.insert(1, str(ROOT.parent / "respond"))
```

- [ ] **Step 4: Timing tests**

The two deadline tests fail on Windows because building `httpx.AsyncClient` takes about 300 ms inside the deadline. Give them room without changing the client:

- `test_hung_a2a_leaves_time_for_the_http_fallback`: `timeout=3.0`, assert elapsed `< 2.6`. A2A sleeps 5 s, so it times out at 60% (1.8 s, plus about 0.3 s client build) and HTTP answers.
- `test_deadline_covers_both_attempts`: `timeout=1.5`, assert elapsed `< 2.5`. Both sleep 5 s, so both time out.

Red edits (record each, revert):
- `test_hung_a2a_leaves_time_for_the_http_fallback`: set `A2A_SHARE = 1.0`. A2A then uses the whole 3 s, so the `elapsed < 2.6` assertion fails.
- `test_deadline_covers_both_attempts`: replace the `TIMEOUT` branch (`code = "TIMEOUT"`) with `code = "TRANSPORT_FAILED"`. Expect the `errorCode == "TIMEOUT"` assertion to fail.

- [ ] **Step 5: README and .gitignore**

`agents/hospital/README.md`: the `scripts/hospital_client.py` row and the usage line point at `agents/respond/hospital_client.py` (run it as `python ../respond/hospital_client.py --url http://localhost:8082 --no-auth --request tests/fixtures/request.stroke.json`). Replace the "Copy `scripts/hospital_client.py` into `agents/respond/`..." paragraph with one sentence: respond-agent's `/handoff` uses `agents/respond/hospital_client.py`.

`.gitignore`: add a line `.superpowers/` under the build-output block.

- [ ] **Step 6: Verify**

From `agents/hospital`: `.venv\Scripts\python -m pytest -q` (create the venv with `requirements.txt` and `requirements-dev.txt` if missing). All tests pass, three runs in a row (timing). `git grep -n "scripts/hospital_client"` returns nothing.

---

### Task 2: respond-agent `/handoff` through the client

**Files:**
- Modify: `agents/respond/main.py`, `agents/respond/requirements.txt`, `.github/workflows/ci.yml`
- Create: `agents/respond/requirements-dev.txt`, `agents/respond/pytest.ini`, `agents/respond/tests/__init__.py`, `agents/respond/tests/test_handoff.py`

**Interfaces:**
- Consumes: `hospital_client.send_handoff` (Task 1).

- [ ] **Step 1: Dependencies**

`agents/respond/requirements.txt`:

```
fastapi==0.115.0
uvicorn==0.30.6
# Same a2a-sdk major as hospital-agent (contract 4.4).
a2a-sdk==1.2.2
google-auth
httpx
requests
```

Create a venv at `agents/respond/.venv` and install. If pip cannot resolve, or `import main` or the TestClient tests error inside fastapi, starlette or pydantic, raise fastapi (and uvicorn if needed) to the versions hospital's venv resolves (google-adk 2.11.0 needs fastapi >= 0.133) and say so. Then add `protobuf` and pin `google-auth`, `httpx`, `requests` and `protobuf` to the versions pip installed (`pip show`).

`agents/respond/.dockerignore`: add `tests/` and `.pytest_cache/` (as hospital's does), so tests do not ship in the image.

`agents/respond/requirements-dev.txt`: `pytest==8.4.2`.

`agents/respond/pytest.ini`:

```
[pytest]
testpaths = tests
```

- [ ] **Step 2: Write the failing tests**

`agents/respond/tests/__init__.py`: empty.

`agents/respond/tests/test_handoff.py`:

```python
from fastapi.testclient import TestClient

import main

BODY = {"incidentId": "i-1", "personId": "margaret", "level": "EMERGENCY", "suspected": "STROKE",
        "findings": ["HR 142"], "hospital": {"id": "h", "name": "H", "etaMin": 9}, "extra": {"kept": True}}


def test_handoff_forwards_body_to_hospital_agent(monkeypatch):
    seen = {}

    async def fake(url, body):
        seen["url"], seen["body"] = url, body
        return {"status": "RECEIVED", "packet": {"text": "PRE-ARRIVAL"}, "fallback": False}

    monkeypatch.setenv("HOSPITAL_AGENT_URL", "https://hospital.example")
    monkeypatch.setattr(main, "send_handoff", fake)
    r = TestClient(main.app).post("/handoff", json=BODY)
    assert r.status_code == 200
    assert r.json() == {"status": "RECEIVED", "packet": {"text": "PRE-ARRIVAL"}, "fallback": False}
    assert seen == {"url": "https://hospital.example", "body": BODY}


def test_handoff_without_hospital_url_fails_without_calling(monkeypatch):
    async def boom(url, body):
        raise AssertionError("must not be called")

    monkeypatch.delenv("HOSPITAL_AGENT_URL", raising=False)
    monkeypatch.setattr(main, "send_handoff", boom)
    r = TestClient(main.app).post("/handoff", json=BODY)
    assert r.status_code == 200 and r.json() == {"status": "FAILED", "fallback": False}
```

- [ ] **Step 3: Run to see them fail**

From `agents/respond`: `.venv\Scripts\python -m pytest -q` → both fail (the stub returns `{"text": "stub"}` and has no `send_handoff`).

- [ ] **Step 4: Implement**

`agents/respond/main.py`: add `import os` and `from hospital_client import send_handoff` at the top. Replace the `/handoff` route:

```python
@app.post("/handoff")
async def handoff(body: dict):
    url = os.environ.get("HOSPITAL_AGENT_URL")
    if not url:
        return {"status": "FAILED", "fallback": False}
    return await send_handoff(url, body)
```

Leave the module docstring and every other route unchanged.

- [ ] **Step 5: CI**

`.github/workflows/ci.yml`, job `agents`: replace the `Hospital tests` step with one that runs for both agents:

```yaml
      - name: Tests
        working-directory: agents/${{ matrix.agent }}
        run: |
          pip install -q -r requirements-dev.txt
          python -m pytest -q
```

- [ ] **Step 6: Green and red edits**

From `agents/respond`: `.venv\Scripts\python -m pytest -q` → 2 passed. `.venv\Scripts\python -c "import main"` works. From `agents/hospital`: the suite still passes.

Red edits (record each, revert):
- `test_handoff_forwards_body_to_hospital_agent`: call `send_handoff(url, {k: v for k, v in body.items() if k != "extra"})`. Expect the body assertion to fail.
- `test_handoff_without_hospital_url_fails_without_calling`: remove the `if not url` guard. Expect the AssertionError from `boom` (500 or raised).

---

## After the last task

- Controller reads the final diff; checks `git status` shows the client moved, not copied.
- Ship needs Dũng's approval (given: "ship"). After merge, Deploy builds respond-agent (its folder changed) and sets `HOSPITAL_AGENT_URL`. Smoke: `POST /api/demo/reset`, then a stroke demo with a slurred answer path, or call respond-agent `/handoff` directly with an identity token, and check `handoff.status` is `RECEIVED` with a real packet.
