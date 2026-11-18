# Azure AI Speech pronunciation scores for the speech check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add Microsoft Azure AI Speech where judges see it: Pronunciation Assessment scores the speech check repeat and the Speech Check card shows the real score next to the verdict.

**Architecture:** respond-agent gets one module `azure.py` that calls the Azure short-audio STT REST API with `httpx` (already a dependency). The check-in audio is browser `webm/opus` or, on the autopilot path, the canned `/sim/red-1.mp3`; Azure accepts only WAV PCM 16 kHz mono or OGG OPUS, so respond-agent converts with `ffmpeg` (added to its Docker image). Gemini stays the judge of CLEAR / SLURRED; Azure adds `assessment.pronunciation` and never changes the verdict. core-api stores the field; the web card prints one extra line. Every Azure step is optional: no key, an error, a timeout or no ffmpeg means no `pronunciation`.

**Tech Stack:** FastAPI + pytest (agents/respond), Spring Boot + JUnit (core-api), React + vitest (web), Azure AI Speech short-audio REST with the `Pronunciation-Assessment` header.

**Spec:** user request 2026-11-19 ("viết plan cho Azure Speech") after the agreed direction: one Microsoft service, least effort, judges must see it. Azure facts checked 2026-11-19 on learn.microsoft.com: short-audio REST takes WAV PCM 16 kHz mono or OGG OPUS, at most 30 s for pronunciation assessment; `uaenorth` supports real-time STT. Fable plan review 2026-11-19: approve with changes, folded in below.

## Global Constraints

- Region `uaenorth` (fallback `westeurope` if the spike fails). Key in Secret Manager secret `azure-speech-key`, injected into respond-agent as env `AZURE_SPEECH_KEY`. `AZURE_SPEECH_REGION` is optional and defaults to `uaenorth` in code. The key never goes in the repo, the web or an artifact.
- Endpoint: `https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1` with params `language=en-US`, `format=detailed`; header `Ocp-Apim-Subscription-Key`; `Content-Type: audio/wav; codecs=audio/pcm; samplerate=16000`.
- Pronunciation-Assessment header: base64 of `{"ReferenceText": <scripts.json en repeat_phrase>, "GradingSystem": "HundredMark", "Granularity": "Word", "Dimension": "Comprehensive", "EnableMiscue": "True"}`.
- Scored only on the English speech-check turn. Azure scores against a native accent; the number is shown, not used for the verdict.
- `TIMEOUT_S = 4` for the Azure call and for ffmpeg. Failures log `azure pronunciation failed: <ErrorType>` only, never the key or audio.
- The CLEAR / SLURRED verdict, triage, escalation and the card's illustrative bars and table do not change.
- Comments one line, imports at the top. No AI attribution. Each test names the production edit that turns it red; record red output in `C:\Users\PC\IdeaProjects\no-one-alone\.superpowers\sdd\2026-11-19-azure-speech\checks.md`, revert from a backup copy. No tautological tests: expected values are literals.

## Review Focus

- Azure down, slow or key missing: the turn still returns well inside core-api's 60 s read timeout and the card shows today's text only.
- Only the speech-check turn calls Azure (`expected` is set only when `asked == 2`).
- ffmpeg missing or failing: `pronunciation` absent, no crash.
- Old Firestore turns without `pronunciation` render as today.
- Gemini CLEAR with a modest Azure score for an accented speaker: look at both real prod values before the demo.

---

### Task 0: Azure resource, secret and spike (user runs the Azure part)

On the Windows PC, PowerShell 5.1, after `az login` to the team's subscription:

```powershell
az group create --name noa-speech --location uaenorth
```

```powershell
az cognitiveservices account create --name noa-speech-uaen --resource-group noa-speech --kind SpeechServices --sku F0 --location uaenorth --yes
```

Then run `infra/azure-speech-secret.ps1` (Task 3). Spike (Claude, after the secret exists): push `web/public/sim/red-1.mp3` and one real browser webm through `azure.to_wav` and `azure.pronunciation`; both return `overall`. If Azure rejects the piped WAV header, switch to `-c:a libopus -f ogg` and `Content-Type: audio/ogg; codecs=opus`. If `uaenorth` rejects pronunciation assessment, use `westeurope`. Record the result in the ledger.

### Task 1: respond-agent `azure.py` and the check-in turn

**Files:** create `agents/respond/azure.py`; modify `agents/respond/checkin.py`, `agents/respond/main.py`, `agents/respond/Dockerfile`; tests `agents/respond/tests/test_azure.py`, `agents/respond/tests/test_checkin.py`.

**Interfaces:** `azure.pronunciation(audio: bytes, reference: str) -> dict | None` returning `{"accuracy": float, "fluency": float, "completeness": float, "overall": float}`. `checkin.turn(body, assess, score=None)`; `score(audio, reference)`.

```python
"""Azure AI Speech pronunciation scores for the speech check. Returns None on any error."""
import base64
import json
import logging
import os
import subprocess

import httpx

log = logging.getLogger("azure")
TIMEOUT_S = 4


def to_wav(audio: bytes) -> bytes:
    return subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-t", "30", "-ac", "1", "-ar", "16000", "-f", "wav", "pipe:1"],
                          input=audio, capture_output=True, check=True, timeout=TIMEOUT_S).stdout


def assessment_header(reference: str) -> str:
    params = {"ReferenceText": reference, "GradingSystem": "HundredMark", "Granularity": "Word",
              "Dimension": "Comprehensive", "EnableMiscue": "True"}
    return base64.b64encode(json.dumps(params).encode()).decode()


def parse_scores(data: dict) -> dict | None:
    if data.get("RecognitionStatus") != "Success" or not data.get("NBest"):
        return None
    best = data["NBest"][0]
    return {"accuracy": best["AccuracyScore"], "fluency": best["FluencyScore"],
            "completeness": best["CompletenessScore"], "overall": best["PronScore"]}


def pronunciation(audio: bytes, reference: str) -> dict | None:
    key = os.environ.get("AZURE_SPEECH_KEY")
    if not key:
        return None
    try:
        region = os.environ.get("AZURE_SPEECH_REGION", "uaenorth")
        r = httpx.post(f"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1",
                       params={"language": "en-US", "format": "detailed"}, content=to_wav(audio), timeout=TIMEOUT_S,
                       headers={"Ocp-Apim-Subscription-Key": key, "Accept": "application/json",
                                "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
                                "Pronunciation-Assessment": assessment_header(reference)})
        r.raise_for_status()
        return parse_scores(r.json())
    except Exception as e:
        log.warning("azure pronunciation failed: %s", type(e).__name__)
        return None
```

In `checkin.turn`, inside the `else` branch after the SLURRED override (checkin.py:35-37), same 12-space indent:

```python
            if expected and score and lang_of(person) == "en":
                scores = score(audio, expected)
                if scores:
                    out["assessment"]["pronunciation"] = scores
```

`main.py:51`: `checkin.turn(body, assessor, azure.pronunciation)` and `import azure`. Dockerfile, before `pip install`: `RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*`.

- [ ] Test `parse_scores` on the literal docs sample (`RecognitionStatus "Success"`, `AccuracyScore 100.0, FluencyScore 100.0, CompletenessScore 100.0, PronScore 95.1`) returns `{"accuracy": 100.0, "fluency": 100.0, "completeness": 100.0, "overall": 95.1}`; `{"RecognitionStatus": "NoMatch"}` returns None. Red: return None always.
- [ ] Test `assessment_header(<the literal en repeat_phrase from scripts.json>)` base64-decodes to the literal dict. Red: drop `EnableMiscue`.
- [ ] Test the request: key set, `to_wav` monkeypatched to return `b"WAV"`, fake `httpx.post` records its args and returns the docs sample; assert the URL is `https://uaenorth.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`, params `{"language": "en-US", "format": "detailed"}`, `content == b"WAV"`, the header set has `Pronunciation-Assessment`, and the result `overall` is `95.1`. Red: change the language to `en-GB`.
- [ ] Test no key: `monkeypatch.delenv("AZURE_SPEECH_KEY", raising=False)`, fake `post` appends to a list and returns the success sample; assert result None and `calls == []`. Red: remove the key check.
- [ ] Test timeout: key set, `to_wav` faked, `post` raises `httpx.ConnectTimeout`; result None. Red: re-raise in `except`.
- [ ] Test (test_checkin) speech-check turn with a fake `score` returning `{"accuracy": 40.0, "fluency": 30.2, "completeness": 100.0, "overall": 41.4}` puts it at `out["assessment"]["pronunciation"]` and clarity stays what the fake assessor returned; on the opening turn a `score` that raises is never called. Red: drop `expected and` from the guard.
- [ ] Test (test_checkin) Arabic person on the speech-check turn never calls `score`. Red: drop `lang_of(person) == "en"`.
- [ ] Run `python -m pytest -q` in agents/respond.

### Task 2: core-api keeps the scores

**Files:** `core-api/src/main/java/com/noonealone/coreapi/model/Assessment.java`; tests `core-api/src/test/java/com/noonealone/coreapi/agent/RespondAgentClientTest.java`, `core-api/src/test/java/com/noonealone/coreapi/model/DocsTest.java`.

Add to `Assessment`: `public Pronunciation pronunciation;` and `public static class Pronunciation { public Double accuracy; public Double fluency; public Double completeness; public Double overall; }`. Storage goes through Jackson (`Docs.toMap` / `Docs.fromMap`, NON_NULL, unknown fields ignored), so old documents load unchanged.

- [ ] Test RespondAgentClient parses a `/checkin/turn` body with `"pronunciation": {"accuracy": 62.5, "fluency": 48.0, "completeness": 100.0, "overall": 61.2}` into those values. Red: annotate the field `@JsonIgnore`.
- [ ] Test DocsTest: `Docs.fromMap(Docs.toMap(assessment with overall 61.2))` keeps `61.2`; `Docs.toMap(new Assessment())` has no `pronunciation` key. Red: annotate the field `@JsonIgnore`.
- [ ] Run `mvn -q test` in core-api (Docker up; check fewer than 2 Testcontainers runs first).

### Task 3: deploy wiring and docs

**Files:** create `infra/azure-speech-secret.ps1`; modify `infra/deploy.ps1`, `README.md`, `docs/data-contract.md`.

- `infra/azure-speech-secret.ps1` (PowerShell 5.1): `$k = az cognitiveservices account keys list --name noa-speech-uaen --resource-group noa-speech --query key1 -o tsv`; `$tmp = [System.IO.Path]::GetTempFileName()`; `try { [System.IO.File]::WriteAllText($tmp, $k); gcloud secrets describe azure-speech-key` or `create --replication-policy=automatic`; `gcloud secrets versions add azure-speech-key --data-file=$tmp`; `gcloud secrets add-iam-policy-binding azure-speech-key --member serviceAccount:respond-agent@<project>.iam.gserviceaccount.com --role roles/secretmanager.secretAccessor } finally { Remove-Item $tmp }`. Prints nothing secret. Same pattern as infra/setup.ps1:84-89.
- `infra/deploy.ps1:33`: when `gcloud secrets describe azure-speech-key --project $ProjectId` exits 0, append `--update-secrets "AZURE_SPEECH_KEY=azure-speech-key:latest"` to the existing `gcloud run services update respond-agent` line. Deploy-Run stays unchanged.
- README: a short "Other services" table after "Google Cloud services": `Azure AI Speech (Microsoft) | Pronunciation scores for the speech check. The repeat recording is sent to Azure in UAE North.`
- docs/data-contract.md: document `assessment.pronunciation` (absent when Azure did not score).

- [ ] Parse check: `powershell -NoProfile -Command "foreach ($f in 'infra/deploy.ps1','infra/azure-speech-secret.ps1') { $e = $null; [System.Management.Automation.Language.Parser]::ParseFile($f, [ref]$null, [ref]$e) | Out-Null; if ($e) { $e } }"` prints nothing.

### Task 4: web shows the score (Huy's card, his OK before merge)

**Files:** `web/src/data/contract.ts` (`Assessment.pronunciation?: { accuracy: number; fluency: number; completeness: number; overall: number }`), `web/src/features/individual/live/SpeechCheckCard.tsx`, `web/src/locales/{en,ar}/live.json`, test in the existing card test file.

- When the speech-check turn has `assessment.pronunciation`, add one `<small className="spk-azure">` under the existing `spk-num` line: en `speech.azure` = `"Azure AI Speech · pronunciation {{overall}} / 100 · fluency {{fluency}}"`, ar = `"Azure AI Speech · النطق {{overall}} / 100 · الطلاقة {{fluency}}"`, rounded integers. Bars, table and `speech.clarity` stay as they are.

- [ ] Test: SLURRED turn with `pronunciation {accuracy: 40, fluency: 30.2, completeness: 100, overall: 41.4}` shows `Azure AI Speech · pronunciation 41 / 100 · fluency 30` and still shows the existing clarity text. Red: do not render the line.
- [ ] Test: turn without `pronunciation` renders no `Azure AI Speech` text. Red: render the line with zeros when absent.
- [ ] Run in web/: `npx tsc -b`, `npx eslint --quiet src tests`, `npx vitest run`.

### Task 5: ship and check on prod (each step needs the user's yes)

- [ ] PR to dev; after merge and deploy, run one speech check on prod with a clear repeat and one with the canned slurred clip; record both `overall` values and the turn time in the ledger.

## Out of scope

- Emirati Arabic voice (`ar-AE-FatimaNeural`): every seed person is `en-AE`, so judges would not hear it, and the recorded clips stay Chirp. Add later only if the pitch needs it.
- The judges' artifact calling Azure: it has no backend link today; Huy's call.
- Arabic pronunciation scoring, using the score in the verdict, replacing Gemini or Chirp.
