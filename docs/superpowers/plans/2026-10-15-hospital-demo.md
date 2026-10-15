# hospital-agent demo readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The deployed hospital-agent returns a full packet for Bà Mai and for Margaret, advertises its real URL, and CI runs its tests.

**Architecture:** The synthetic FHIR bundles move inside `agents/hospital/` so they are in the Cloud Run image, and the fixture reader loads `{personId}.json`. A per-person profile in `packet.py` sets the timezone, the label language and the baseline. `deploy.ps1` sets `A2A_PUBLIC_URL` after deploying. Minh's contract extensions move into `docs/contract.md`.

**Tech Stack:** Python 3.12, Starlette, google-adk[a2a] 2.11.0, a2a-sdk 1.2.2, pydantic, pytest; PowerShell deploy script; GitHub Actions.

**Spec:** Design approved by Dũng in chat on 15/10 (bounded change). Review that drove it: hospital-agent at `origin/dev` `d800131`. Contract: `docs/contract.md` v1.4 section 4.4.

## Global Constraints

- Bà Mai's golden packet `agents/hospital/tests/fixtures/packet.stroke.json` stays byte-identical. Every existing test stays green (67 at start).
- Packet field names and presence rules do not change. Only data, reader location and text labels change.
- `personId` is kebab-case (contract section 1). The reader never builds a path from anything else.
- No secrets, no real patient data. Every bundle resource carries the `HTEST` security tag.
- Comments at most one short line; no comments that restate code, no banners, no history tags.
- Docs: short plain sentences, no em-dashes.

## Review Focus

1. `personId` such as `../../etc/passwd` or `Ba-Mai`: reader returns `[]` (PATIENT_NOT_FOUND), never reads outside the data dir. Test in Task 2.
2. A personId with no profile (e.g. a new person added later): packet still builds, with Bà Mai's defaults. Test in Task 3.
3. Margaret's last-known-well near midnight: shown in Sydney time with AEDT, not UTC+7. Test in Task 3.
4. A bundle file that exists but is not valid JSON: `RECORD_UNAVAILABLE`, not a crash. Test in Task 2.
5. Cloud Run image actually contains the bundles: the data dir sits under `agents/hospital/` and is not in `.dockerignore`. Test in Task 2.

## Working rules for implementers

- Worktree `C:\Users\PC\IdeaProjects\no-one-alone-hospital`, branch `fix/hospital-demo` from `origin/dev` `d800131`. The controller commits; do not run `git commit` or `git add`, except `git mv` where a step says so.
- Python: create a venv at `agents/hospital/.venv` (gitignored), `pip install -r requirements.txt -r requirements-dev.txt`, run `python -m pytest -q` from `agents/hospital`.
- Every new test names a red edit. Apply it, run the test, paste the failing lines into `.superpowers/sdd/2026-10-15-hospital-demo/checks.md` under the task heading, revert, run green.

## File map

| File | Change | Task |
|---|---|---|
| `infra/deploy.ps1` | set `A2A_PUBLIC_URL` after the hospital deploy | 1 |
| `.github/workflows/ci.yml` | run hospital pytest | 1 |
| `data/fhir/ba-mai.json` -> `agents/hospital/data/fhir/ba-mai.json` | move | 2 |
| `data/fhir/README.md` -> `agents/hospital/data/fhir/README.md` | move, update | 2 |
| `agents/hospital/handoff/fhir.py` | reader loads `{personId}.json` from a dir | 2 |
| `agents/hospital/handoff/packet.py` | "record not found" text | 2 |
| `agents/hospital/tests/conftest.py`, `tests/test_record.py`, `tests/test_pipeline.py` | new paths and tests | 2 |
| `agents/hospital/README.md` | env var and fixture rows | 2 |
| `agents/hospital/data/fhir/margaret.json` | new bundle | 3 |
| `agents/hospital/handoff/packet.py` | per-person profile and English labels | 3 |
| `agents/hospital/requirements.txt` | `tzdata` | 3 |
| `agents/hospital/tests/test_pipeline.py`, `tests/test_contracts.py` | Margaret tests | 3 |
| `docs/contract.md` | fold in extensions | 4 |
| `agents/hospital/docs/contract-extensions.md` | delete | 4 |
| `agents/hospital/**/*.py` | one-line docstrings | 4 |

Task order: 1, 2, 3, 4. Task 1 touches no Python and can run beside Task 2.

---

### Task 1: Deploy sets A2A_PUBLIC_URL; CI runs hospital tests

**Files:**
- Modify: `infra/deploy.ps1:21`
- Modify: `.github/workflows/ci.yml` (job `agents`)

No unit test: PowerShell and workflow YAML. Verification is parsing both files and the CI run on the PR.

- [ ] **Step 1: deploy.ps1**

Replace the hospital line:

```powershell
if ($Target -in "all", "hospital") {
    Deploy-Run "hospital-agent" "agents/hospital" "hospital-agent" $false
    # The agent card advertises this URL; A2A clients send messages to it.
    $hospitalUrl = gcloud run services describe hospital-agent --region $Region --project $ProjectId --format="value(status.url)"
    if (-not $hospitalUrl) { throw "hospital-agent URL not found" }
    gcloud run services update hospital-agent --region $Region --project $ProjectId --update-env-vars "A2A_PUBLIC_URL=$hospitalUrl" --quiet
    if ($LASTEXITCODE -ne 0) { throw "Setting A2A_PUBLIC_URL on hospital-agent failed" }
}
```

- [ ] **Step 2: ci.yml**

In job `agents`, after the step `Install and import`, add:

```yaml
      - name: Hospital tests
        if: matrix.agent == 'hospital'
        working-directory: agents/hospital
        run: |
          pip install -q -r requirements-dev.txt
          python -m pytest -q
```

- [ ] **Step 3: Verify**

Run from the worktree root:
`powershell -NoProfile -Command "$null = [System.Management.Automation.Language.Parser]::ParseFile('infra/deploy.ps1', [ref]$null, [ref]$e); $e.Count"` → `0`.
`python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('ok')"` → `ok` (install `pyyaml` in the venv if missing).

---

### Task 2: Bundles inside the image, reader per person

**Files:**
- Move: `data/fhir/ba-mai.json` -> `agents/hospital/data/fhir/ba-mai.json` (`git mv`)
- Move: `data/fhir/README.md` -> `agents/hospital/data/fhir/README.md` (`git mv`)
- Modify: `agents/hospital/handoff/fhir.py`
- Modify: `agents/hospital/handoff/packet.py` (`render_text`, not-found row)
- Modify: `agents/hospital/tests/conftest.py:10`, `tests/test_record.py:81-86`, `tests/test_pipeline.py`
- Modify: `agents/hospital/README.md` (rows for `handoff/fhir.py`, `FHIR_FIXTURE`)

**Interfaces:**
- Produces: `fhir.DEFAULT_DIR: Path` (= `agents/hospital/data/fhir`), `FixtureReader(directory: Path | str = DEFAULT_DIR)`, env `FHIR_FIXTURE_DIR`. `FHIR_FIXTURE` is removed.

- [ ] **Step 1: Move the data**

```bash
git mv data/fhir/ba-mai.json agents/hospital/data/fhir/ba-mai.json
git mv data/fhir/README.md agents/hospital/data/fhir/README.md
```

In the moved README, change the last paragraph to: "hospital-agent reads these files directly in fixture mode (`FHIR_SOURCE=fixture`), one file per `personId`. They sit inside `agents/hospital` so the Cloud Run image contains them." Keep the rest.

`conftest.py:10` becomes `BUNDLE = ROOT / "data" / "fhir" / "ba-mai.json"`.

- [ ] **Step 2: Write the failing tests**

`tests/test_record.py`: replace `test_fixture_reader_returns_patient_compartment_and_empty_for_unknown` with:

```python
def test_fixture_reader_returns_patient_compartment_and_empty_for_unknown(bundle):
    import asyncio
    reader = FixtureReader()
    assert len(asyncio.run(_read(reader, "ba-mai"))) == len(bundle["entry"])
    assert asyncio.run(_read(reader, "nobody")) == []


def test_fixture_reader_never_reads_outside_the_data_dir(tmp_path):
    import asyncio, json
    (tmp_path / "data").mkdir()
    outside = tmp_path / "outside.json"
    outside.write_text(json.dumps({"entry": [{"resource": {"resourceType": "Patient", "id": "../outside"}}]}),
                       encoding="utf-8")
    assert asyncio.run(_read(FixtureReader(tmp_path / "data"), "../outside")) == []


@pytest.mark.parametrize("pid", ["../../etc/passwd", "..", "Ba-Mai", "ba_mai", ""])
def test_fixture_reader_rejects_ids_that_are_not_kebab_case(pid):
    import asyncio
    assert asyncio.run(_read(FixtureReader(), pid)) == []


def test_fixture_reader_unreadable_file_is_record_unavailable(tmp_path):
    import asyncio
    (tmp_path / "ba-mai.json").write_text("{not json", encoding="utf-8")
    with pytest.raises(RecordUnavailable):
        asyncio.run(_read(FixtureReader(tmp_path), "ba-mai"))


def test_bundles_live_inside_the_service_dir():
    from handoff.fhir import DEFAULT_DIR
    assert DEFAULT_DIR.resolve().is_relative_to(ROOT.resolve())
    assert (DEFAULT_DIR / "ba-mai.json").is_file()
    assert "data" not in (ROOT / ".dockerignore").read_text(encoding="utf-8").split()
```

Add imports at the top of `test_record.py` if missing: `import pytest`, `from handoff.fhir import FixtureReader, RecordUnavailable`, `from tests.conftest import ROOT` (conftest is importable only as `tests.conftest`, as in `test_pipeline.py`).

`tests/test_pipeline.py`, extend `test_unknown_patient_is_partial`:

```python
def test_unknown_patient_is_partial(request_body):
    _, out = handle(request_body, [])
    assert out["status"] == "PARTIAL" and out["warnings"] == ["PATIENT_NOT_FOUND"]
    assert "record not found" in out["text"] and "record unavailable" not in out["text"]
```

- [ ] **Step 3: Run to see them fail**

Run: `python -m pytest -q tests/test_record.py tests/test_pipeline.py`
Expected: failures on the outside-dir, DEFAULT_DIR and not-found tests (the unreadable-file test may already pass under the old code; its red edit below proves it).

- [ ] **Step 4: Implement the reader**

`handoff/fhir.py`, replace `DEFAULT_FIXTURE`, `FixtureReader` and `default_reader`:

```python
import re

DEFAULT_DIR = Path(__file__).resolve().parent.parent / "data" / "fhir"
PERSON_ID = re.compile(r"[a-z0-9]+(-[a-z0-9]+)*")


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
```

Delete the two-line comment above the old `DEFAULT_FIXTURE`.

- [ ] **Step 5: Not-found text**

`handoff/packet.py`, in `render_text.row`:

```python
        if not record_read:
            if "PATIENT_NOT_FOUND" in p.warnings:
                return "không có hồ sơ (record not found)"
            return "không đọc được hồ sơ (record unavailable)"
```

(Task 3 moves these strings into the label table; keep them literal here.)

- [ ] **Step 6: README rows**

`agents/hospital/README.md`: the `handoff/fhir.py` row says fixture mode reads `data/fhir/{personId}.json` inside the service. Replace the `FHIR_FIXTURE` row with `| FHIR_FIXTURE_DIR | data/fhir (inside agents/hospital) | One bundle per personId |`. Remove the sentence that fixture mode answers `PARTIAL` on Cloud Run.

- [ ] **Step 7: Green and red edits**

Run: `python -m pytest -q` → all pass (67 + 8 new = 75 at least).

Red edits (record each, revert):
- `test_fixture_reader_never_reads_outside_the_data_dir`: remove the `PERSON_ID.fullmatch` guard. Expect the planted `../outside` Patient to be returned.
- `test_fixture_reader_rejects_ids_that_are_not_kebab_case`: change the regex to `r".+"`. Expect at least one case (`..` is a directory, so use the `ba_mai`/`Ba-Mai` cases on a case-insensitive FS) to differ; if none goes red on this machine, record that and rely on the outside-dir test.
- `test_fixture_reader_unreadable_file_is_record_unavailable`: change `except (OSError, ValueError)` to `except OSError`. Expect `JSONDecodeError`.
- `test_bundles_live_inside_the_service_dir`: set `DEFAULT_DIR` back to `Path(__file__).resolve().parents[3] / "data" / "fhir"`. Expect the `is_relative_to` assertion to fail.
- `test_unknown_patient_is_partial`: remove the `PATIENT_NOT_FOUND` branch. Expect "record unavailable" in the text.

---

### Task 3: Margaret's bundle and per-person packet

**Files:**
- Create: `agents/hospital/data/fhir/margaret.json`
- Modify: `agents/hospital/handoff/packet.py`
- Modify: `agents/hospital/requirements.txt` (add `tzdata==2025.2`)
- Test: `agents/hospital/tests/test_pipeline.py`, `tests/test_contracts.py`

**Interfaces:**
- Consumes: `FixtureReader` and `DEFAULT_DIR` from Task 2.
- Produces: `packet.PROFILES: dict[str, Profile]`, `packet.profile(person_id) -> Profile`.

- [ ] **Step 1: Write margaret.json**

Copy the structure of `ba-mai.json` exactly (Bundle type `transaction`, `HTEST` tag on the bundle and every resource, `PUT` with fixed ids, same Consent shape and period, same stated-age extension, no `birthDate`). Bundle id `margaret-synthetic`. Resources:

| Resource id | Content |
|---|---|
| `Patient/margaret` | name text `Margaret Collins`, given `Margaret`, family `Collins`; gender `female`; stated age 78; address text `14 Wilga Street, Marrickville NSW 2204 (fictional)`, city `Sydney`, country `AU` |
| `Condition/margaret-hypertension` | SNOMED 38341003 Hypertensive disorder, text `hypertension`, active, confirmed |
| `Condition/margaret-hearing-loss` | SNOMED 15188001 Hearing loss, text `hearing loss`, active, confirmed |
| `Condition/margaret-ckd` | SNOMED 700378005 Chronic kidney disease stage 3A, text `chronic kidney disease stage 3a`, active, confirmed |
| `Condition/margaret-prediabetes` | SNOMED 714628002 Prediabetes, text `prediabetes`, active, confirmed |
| `Condition/margaret-knee-oa` | SNOMED 239873007 Osteoarthritis of knee, text `osteoarthritis of both knees`, active, confirmed |
| `Condition/margaret-af` | SNOMED 49436004 Atrial fibrillation, text `atrial fibrillation`, active, verificationStatus `provisional` |
| `MedicationStatement/margaret-amlodipine` | RxNorm 17767 amlodipine, dose text `5 mg each evening`, active |
| `MedicationStatement/margaret-vitamin-d` | RxNorm 11253 vitamin D3 (cholecalciferol), dose text `1000 IU daily`, active |
| `MedicationStatement/margaret-paracetamol` | RxNorm 161 paracetamol (acetaminophen), dose text `500 mg as needed`, active |
| `AllergyIntolerance/margaret-penicillin` | same as Bà Mai's penicillin allergy, patient `Patient/margaret`, reaction text `rash` if Bà Mai's has a reaction |
| `FamilyMemberHistory/margaret-father` | relationship FTH, text `father`; conditions stroke (230690007, code text `stroke`, onsetAge 74) and type 2 diabetes (44054006, code text `type 2 diabetes`) |
| `FamilyMemberHistory/margaret-mother` | relationship MTH, text `mother`; condition dementia (52448006, code text `dementia`) |
| `Consent/margaret-hospital-sharing` | same as `ba-mai-hospital-sharing` with patient `Patient/margaret` |

Match how `ba-mai.json` encodes each field (dose, reaction, onsetAge). If Bà Mai's resource has a field this table does not mention, copy its shape.

- [ ] **Step 2: Write the failing tests**

`tests/test_contracts.py`: make the bundle checks cover every bundle file:

```python
@pytest.mark.parametrize("name", ["ba-mai", "margaret"])
def test_every_bundle_is_synthetic_with_resolvable_references(name):
    bundle = load_json(ROOT / "data" / "fhir" / f"{name}.json")
    ...
```

Reuse the body of `test_bundle_is_synthetic_transaction_with_resolvable_references` and `test_bundle_has_no_birth_date` for each name (keep the original tests if parametrizing them is awkward; then add the parametrized copies).

`tests/test_pipeline.py`, add:

```python
def _margaret_request(request_body):
    body = dict(request_body, personId="margaret", lastKnownWellAt="2026-10-15T14:55:00Z",
                onScene={"name": "David", "relation": "son"})
    body["hospital"] = {"id": "sydney-stroke-center", "name": "Sydney Stroke Center (demo)", "etaMin": 9}
    return body


def test_margaret_packet_is_english_in_sydney_time(request_body):
    import asyncio
    from handoff.fhir import FixtureReader
    resources = asyncio.run(FixtureReader().read("margaret"))
    _, out = handle(_margaret_request(request_body), resources)
    assert out["status"] == "COMPLETED"
    assert out["patient"] == {"name": "Margaret Collins", "age": 78, "sex": "F"}
    assert "penicillin" in out["allergies"] and "HARD_OF_HEARING" in out["communication"]
    assert out["baseline"] == "Lives alone, independent, walking stick outdoors"
    text = out["text"]
    assert text.startswith("PRE-ARRIVAL · ETA 9 min\nMargaret Collins, 78, F")
    assert "Last well: 01:55 16/10 (AEDT)" in text
    assert "Status: suspected stroke" in text
    assert text.endswith("SYNTHETIC DEMO DATA")
    assert not any(ch in text for ch in "ạảấầậếềệịọốồộờớợụủứừựỳ")


def test_person_without_profile_uses_default_labels(request_body, resources):
    _, out = handle(dict(request_body, personId="new-person"), resources)
    assert "Tình trạng (Status)" in out["text"] and "(UTC+7)" in out["text"]
```

(`handle` uses `ListReader`, which ignores `person_id`; the packet is `BLOCKED_CONSENT`, and the labels still come from `profile("new-person")`.)

`tests/test_contracts.py` needs `from tests.conftest import ROOT, load_json` for the parametrized bundle test.

- [ ] **Step 3: Run to see them fail**

Run: `python -m pytest -q tests/test_pipeline.py tests/test_contracts.py` → Margaret tests fail.

- [ ] **Step 4: Implement profiles and labels**

`requirements.txt`: add `tzdata==2025.2` (zoneinfo needs it on slim images and on Windows).

`handoff/packet.py`: replace `HUE`, `BASELINE`, `WITHHELD`, `NONE_RECORDED`, `_local` and the literal strings in `render_text` with a label table and a profile:

```python
from dataclasses import dataclass
from zoneinfo import ZoneInfo

VI = {
    "withheld": "không chia sẻ (withheld: no consent)",
    "none_recorded": "chưa ghi nhận (none recorded)",
    "unavailable": "không đọc được hồ sơ (record unavailable)",
    "not_found": "không có hồ sơ (record not found)",
    "patient": "Bệnh nhân (patient): ",
    "stroke": "nghi đột quỵ (suspected stroke)",
    "emergency": "cấp cứu, chưa rõ nguyên nhân (emergency, cause unknown)",
    "unknown": "không rõ (unknown)",
    "no_findings": "không có (none reported)",
    "family": " · gia đình (family): ",
    "allergy_unknown": "chưa ghi nhận, cần hỏi (not recorded, ask)",
    "no_allergy": "không dị ứng đã biết (no known allergy, recorded)",
    "no_contact": "không có (none)",
    "status": "Tình trạng (Status)", "last_well": "Bình thường lần cuối (Last well)",
    "findings": "Dấu hiệu (Findings)", "history": "Bệnh sử (History)", "meds": "Thuốc (Medicines)",
    "allergy": "Dị ứng (Allergy)", "function": "Chức năng (Function)", "comms": "Giao tiếp (Comms)",
    "contact": "Người nhà (Contact)", "footer": "DỮ LIỆU MÔ PHỎNG · SYNTHETIC DEMO DATA",
}
EN = {
    "withheld": "withheld: no consent",
    "none_recorded": "none recorded",
    "unavailable": "record unavailable",
    "not_found": "record not found",
    "patient": "Patient: ",
    "stroke": "suspected stroke",
    "emergency": "emergency, cause unknown",
    "unknown": "unknown",
    "no_findings": "none reported",
    "family": " · family: ",
    "allergy_unknown": "not recorded, ask",
    "no_allergy": "no known allergy (recorded)",
    "no_contact": "none",
    "status": "Status", "last_well": "Last well", "findings": "Findings", "history": "History",
    "meds": "Medicines", "allergy": "Allergy", "function": "Function", "comms": "Comms",
    "contact": "Contact", "footer": "SYNTHETIC DEMO DATA",
}


@dataclass(frozen=True)
class Profile:
    zone: ZoneInfo
    zone_label: str | None  # None: use the zone's abbreviation (AEDT/AEST)
    labels: dict[str, str]
    baseline: str


PROFILES = {
    "ba-mai": Profile(ZoneInfo("Asia/Ho_Chi_Minh"), "UTC+7", VI, "Lives alone, independent"),
    "margaret": Profile(ZoneInfo("Australia/Sydney"), None, EN, "Lives alone, independent, walking stick outdoors"),
}


def profile(person_id: str) -> Profile:
    return PROFILES.get(person_id, PROFILES["ba-mai"])


def _local(ts: str, pr: Profile) -> str:
    t = datetime.fromisoformat(ts).astimezone(pr.zone)
    return t.strftime("%H:%M %d/%m") + f" ({pr.zone_label or t.tzname()})"
```

In `build`: `baseline = profile(req.person_id).baseline if ok("identity") else None`, and call `render_text(packet, record_read=..., pr=profile(req.person_id))`.

`render_text(p, *, record_read, pr)`: use `L = pr.labels` for every string above, `_local(p.last_known_well_at, pr)` for the last-well row, and rows formatted `f"{L['status']}: {status}"` etc. The output for `ba-mai` must stay byte-identical to the golden packet.

Remove the `timedelta`/`timezone` imports if unused.

- [ ] **Step 5: Green and red edits**

Run: `python -m pytest -q` → all pass; golden packet unchanged.

Red edits (record each, revert):
- `test_margaret_packet_is_english_in_sydney_time`: make `profile` always return `PROFILES["ba-mai"]`. Expect Vietnamese labels and UTC+7.
- `test_person_without_profile_uses_default_labels`: change the fallback to `PROFILES["margaret"]`. Expect English labels.
- Parametrized bundle test for `margaret`: delete the `HTEST` tag from one Margaret resource. Expect the synthetic-tag assertion to fail.

---

### Task 4: Contract owns the extensions; one-line comments

**Files:**
- Modify: `docs/contract.md` section 4.4
- Delete: `agents/hospital/docs/contract-extensions.md`
- Modify: module docstrings and multi-line comments in `agents/hospital/main.py`, `agent.py`, `handoff/*.py`
- Modify: `agents/hospital/README.md` (links to the deleted file)

No new tests: docs and comments. The full suite must stay green.

- [ ] **Step 1: Contract 4.4**

After the packet example in 4.4, add, in short plain sentences, from `contract-extensions.md` sections 1 to 5:
- A table of the extra packet fields `status`, `familyHistory`, `withheld`, `warnings`, `sources` and the six categories.
- Field presence rules (section 2 of the extensions).
- Consent rule: no valid Consent gives `BLOCKED_CONSENT` and nothing from the record is shared; request facts are always included; no emergency override.
- Text: first line `PRE-ARRIVAL · ETA n min` or `ETA unknown`, then the patient line, then rows in a fixed order. Labels follow the person: Vietnamese with English in brackets for `ba-mai`, English for `margaret`. Times in the person's timezone. Last line names the data as synthetic.
- Transport: completed A2A task with one text part holding the packet JSON; errors use the contract error shape; HTTP fallback `POST /handoff`; pinned versions; `A2A_PUBLIC_URL` is set by `deploy.ps1`.

Do not copy section 6 (points for core-api); the controller reports those to Dũng.

- [ ] **Step 2: Delete the extensions file and fix links**

`git rm agents/hospital/docs/contract-extensions.md`. Update any README line that links to it to point at `docs/contract.md` section 4.4. `contracts.py` first line refers to contract v1.4.

- [ ] **Step 3: One-line comments**

Cut each module docstring and multi-line comment in `main.py`, `agent.py`, `handoff/consent.py`, `contracts.py`, `fhir.py`, `packet.py`, `pipeline.py`, `record.py` to one line, or delete it when it restates the code. Remove the "pending Dũng's review" note in `contracts.py`. Do not change code.

- [ ] **Step 4: Verify**

Run: `python -m pytest -q` → all pass. `grep -rn "contract-extensions" .` from the worktree root → nothing. `grep -c "—" docs/contract.md` → `0`.

---

## After the last task

- Controller reads the final diff, checks the golden packet is unchanged and that `git status` shows the data moved (not copied).
- Ship needs Dũng's approval. After merge, Deploy redeploys hospital-agent and sets `A2A_PUBLIC_URL`; check `GET /.well-known/agent-card.json` on the service shows the run.app URL with a `:443` suffix (`to_a2a` always adds the port; the service is private: call with an identity token).
- Report to Dũng the extension section 6 points for core-api (handoff "RECEIVED" wording, `onScene` before anyone accepts).
