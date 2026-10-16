# respond-agent (verify, check-in, triage, plan) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace respond-agent's stub routes with a rule-first agent: deterministic verify, triage and plan; scripted check-in questions in Huế Vietnamese or English; Gemini only for understanding the person's spoken answer; Chirp voice for questions and safety instructions; every failure falls back to rules with `fallback: true`.

**Architecture:** Pure functions in small modules (`rules.py`, `checkin.py`, `plan.py`) take the contract 4.3 request bodies and return the reply bodies. Two adapters in `gcp.py` wrap Gemini (audio assessment) and Cloud Text-to-Speech; they are injected so tests never call Google. `main.py` wires routes to modules and adapters. `scripts.json` holds every sentence the agent may say.

**Tech Stack:** Python 3.12, FastAPI 0.115.0, google-genai (Vertex AI, ADC), google-cloud-texttospeech, pytest.

**Spec:** Design approved by Dũng in chat on 16/10 (rule-first respond-agent; Gemini for audio understanding; Chirp 3 HD voices; templates for plan). Contract: `docs/contract.md` section 4.3 (shapes below are copied from it) and the `checkIn` table in 2.3 (`assessment.clarity` is `CLEAR` | `SLURRED` | `NO_SPEECH`). core-api's `Level` is `OK` | `MONITOR` | `COME_NOW` | `EMERGENCY`. core-api stops check-in after 4 agent turns (`IncidentFlow.MAX_AGENT_TURNS`) and after 2 no-replies.

## Global Constraints

- Reply shapes exactly as contract 4.3. Absent optional fields are omitted, never `null`.
- Every reply carries `fallback`. `fallback: true` only when a model or TTS call failed and rules or text-only output replaced it.
- `next.kind` is `YES_NO` whenever `noReplyCount >= 1`. `next` is absent when `done` is true.
- `transcript` and `assessment` appear only when `input` was audio.
- Triage rules override everything: any `SLURRED` turn gives `EMERGENCY`; `noReplyCount >= 2` gives at least `COME_NOW`.
- `personInstruction.text` is built only from `scripts.json`. No model writes safety instructions.
- Language: `person.locale` starting with `en` gives English everywhere and addresses the person by `displayName`; otherwise Vietnamese with Huế forms of address ("Mạ", "con"). Times in `callScript` use the person's `timezone`.
- No patient data or audio in logs. No secrets in the repo; Google calls use ADC.
- respond-agent must answer within core-api's 60 s read timeout: Gemini and TTS calls get a 15 s timeout each.
- `/handoff` (already forwarding to hospital-agent) does not change.
- Comments at most one line. Docs: short plain sentences, no em-dashes.

## Review Focus

1. Audio that Gemini cannot parse, or Gemini down: `assessment.clarity` is `NO_SPEECH`, `fallback: true`, the next scripted question is still asked. Test in Task 2.
2. A `window` with no moving point: `lastKnownWellAt` is the first window point, not invented. Test in Task 1.
3. TTS down: `next` and `personInstruction` still carry `text`, no `audioBase64`/`mimeType`, `fallback: true`. Test in Task 4.
4. Margaret (`en-AU`, no `dialect`, timezone `Australia/Sydney`): English questions, messages, `callScript` with Sydney time. Tests in Tasks 2 and 3.
5. A member with no `etaMin` (DISTANT, or Routes failed): message has no ETA phrase. Test in Task 3.

## Working rules for implementers

- Worktree `C:\Users\PC\IdeaProjects\no-one-alone-respond-agent`, branch `feat/respond-agent` from `origin/dev` `7722e51`. Do not `git add` or commit; the controller commits.
- venv at `agents/respond/.venv` (created in Task 0); run `.venv\Scripts\python -m pytest -q` from `agents/respond`. Never install into system Python.
- Every new test names a red edit. Apply it, run, paste the failing lines into `.superpowers/sdd/2026-10-16-respond-agent/checks.md` under the task heading, revert, run green.
- Keep `hospital_client.py` and the `/handoff` route and its tests unchanged.

## File map

| File | Responsibility | Task |
|---|---|---|
| `agents/respond/rules.py` | `verify(body)`, `triage(body)` | 1 |
| `agents/respond/scripts.json` | every sentence: check-in questions, yes/no prompts, safety scripts, message and call templates, per language | 2, 3 |
| `agents/respond/lang.py` | `is_en(person)`, `load_scripts()`, `fmt_local(iso, tz)` | 2 |
| `agents/respond/checkin.py` | `turn(body, assess) -> dict` | 2 |
| `agents/respond/plan.py` | `plan(body) -> dict` | 3 |
| `agents/respond/gcp.py` | `GeminiAssessor`, `ChirpVoice` adapters | 4 |
| `agents/respond/main.py` | routes wired to modules and adapters | 4 |
| `agents/respond/requirements.txt` | `google-genai`, `google-cloud-texttospeech` | 4 |
| `agents/respond/tests/test_rules.py`, `test_checkin.py`, `test_plan.py`, `test_routes.py` | tests | 1-4 |

Order: 0, 1, 2, 3, 4. Task 1 is independent of 2 and 3; 2 and 3 share `scripts.json` and `lang.py` (2 creates them, 3 adds keys).

---

### Task 0: Dependencies first

**Files:** Modify `agents/respond/requirements.txt`.

- [ ] From `agents/respond`: `python -m venv .venv`, then `.venv\Scripts\pip install -r requirements.txt -r requirements-dev.txt google-genai google-cloud-texttospeech tzdata==2025.2`, then `.venv\Scripts\pip check`.
- [ ] Pin the resolved `google-genai`, `google-cloud-texttospeech` and `tzdata==2025.2` in `requirements.txt`. If protobuf or google-auth must move, change the pin and confirm `tests/test_handoff.py` still passes.
- [ ] No test of its own (no logic). Record the `pip check` output in checks.md.

---

### Task 1: Verify and triage rules

**Files:** Create `agents/respond/rules.py`, `agents/respond/tests/test_rules.py`.

**Interfaces:**
- Produces: `rules.verify(body: dict) -> dict` returning `{"isReal", "reason", "lastKnownWellAt"?, "fallback": False}`; `rules.triage(body: dict) -> dict` returning `{"level", "reasons", "fallback": False}`.

Verify rules (body as in 4.3: `person.baseline.nightHr`, `person.baseline.restingHr`, `alert.hr`, `alert.movementMin`, `alert.kind`, `window[]` of `{at, hr, steps, moving}` oldest first):
- `baseline = person.baseline.nightHr or restingHr or 60`.
- Real when `alert.hr >= baseline + 30` and `alert.movementMin >= 2`, or `alert.kind` contains `FALL`.
- Not real otherwise. Reason for false alarm names the signal, e.g. `"HR 96 with movement: active, not an emergency"`.
- Reason when real: `f"HR {hr} at rest, baseline {baseline}, no movement for {movementMin} min"` (English; core-api logs it).
- `lastKnownWellAt`: the `at` of the last window point with `moving` true and `hr <= baseline + 20`; if none, the first window point's `at`; omit if `window` is empty.

Checked by the controller: stroke (HR 142, movementMin 4) and fall (FALL kind, HR 96, movementMin 3) are real, false-alarm (movementMin 0) is not, and the last moving point is under baseline + 20 in both real fixtures. Still read the three fixtures `core-api/src/main/resources/data/scenarios/{stroke,fall,false-alarm}.json` and the seed baselines (`ba-mai` nightHr 58, `margaret` nightHr 57): STROKE and FALL must come out real, FALSE_ALARM must come out not real. If a threshold above misclassifies a fixture, adjust the threshold and say so.

Triage rules (body: `alert.hr`, `turns[]` with optional `assessment`, `noReplyCount`):
- Any turn with `assessment.clarity == "SLURRED"`: `EMERGENCY`, reason `"slurred speech"`.
- Any `assessment.symptoms` non-empty: at least `COME_NOW`, reasons list the symptoms.
- `noReplyCount >= 2`: at least `COME_NOW`, reason `"no answer"`.
- `alert.kind` contains `FALL`: at least `COME_NOW`, reason `"fall detected"` (a MONITOR result closes the incident in core-api, so the fall demo must escalate).
- Last PERSON turn text (`t.get("text") or ""`, it can be null) is `"Không"` or `"No"`: at least `COME_NOW`, reason `"answered no"`.
- `alert.hr >= 130` with no CLEAR answer: at least `COME_NOW`, reason `f"HR {hr} without activity"`.
- A person turn with `CLEAR`, coherent, no symptoms, and the last yes/no answer `YES` (turn text "Có"/"Yes"): `MONITOR` unless a rule above applies.
- Otherwise `MONITOR`.
- Order of severity: OK < MONITOR < COME_NOW < EMERGENCY; take the highest.

- [ ] **Step 1: Tests** (`tests/test_rules.py`), using the real fixtures via a small loader that turns `minutesBefore` into `at` strings like core-api does:
  - stroke and fall fixtures are real; false-alarm is not real.
  - `lastKnownWellAt` for the stroke fixture equals the last moving, near-baseline point.
  - empty window: no `lastKnownWellAt` key.
  - triage: SLURRED anywhere gives EMERGENCY with "slurred speech"; noReplyCount 2 gives COME_NOW; HR 142 and no answers gives COME_NOW; one CLEAR coherent answer plus YES and HR 80 gives MONITOR; symptoms ["chest pain"] gives COME_NOW and lists it; fall fixture alert with a YES answer gives COME_NOW with "fall detected"; a "Không" answer gives COME_NOW; a turn with `"text": null` does not crash.
- [ ] **Step 2: Run red, implement, run green.**
- [ ] **Step 3: Red edits** (record, revert): drop the SLURRED rule (EMERGENCY test fails); swap the `lastKnownWellAt` selection to the first point (stroke test fails); change the real threshold to `+ 100` (stroke real test fails); drop the FALL triage rule (fall test fails).

---

### Task 2: Scripted check-in turn

**Files:** Create `agents/respond/scripts.json`, `agents/respond/lang.py`, `agents/respond/checkin.py`, `agents/respond/tests/test_checkin.py`.

**Interfaces:**
- Produces: `lang.is_en(person) -> bool`, `lang.load_scripts() -> dict` (cached), `lang.fmt_local(iso: str | None, tz: str | None) -> str | None` (`"HH:MM"`, `None` for `None`; default tz `Asia/Ho_Chi_Minh`); `load_scripts` opens `Path(__file__).with_name("scripts.json")`; `checkin.turn(body: dict, assess: Callable[[bytes, str, dict], dict | None]) -> dict`. `assess(audio, mime, ctx)` returns `{"transcript", "clarity", "coherent", "symptoms", "confidence"}` or `None` on failure; `ctx` has `locale` and `expected` (the phrase the person was asked to repeat, or `None`).
- Adds `tzdata` to requirements if `zoneinfo` needs it (it does on Windows and slim images; hospital pins `tzdata==2025.2`).

`scripts.json` shape (Task 3 adds more keys):

```json
{
  "vi": {
    "questions": [
      "Mạ ơi, {caller} nhờ con hỏi thăm mạ. Mạ có nghe con nói không?",
      "Mạ nhắc lại giúp con: hôm nay trời đẹp.",
      "Mạ có thấy đau ngực, chóng mặt hay vừa bị té không?",
      "Mạ có cử động tay chân được không?"
    ],
    "repeat_phrase": "hôm nay trời đẹp",
    "yes_no": "Mạ có nghe con không? Mạ bấm CÓ hoặc KHÔNG.",
    "caller_default": "Gia đình"
  },
  "en": {
    "questions": [
      "{name}, it's your No One Alone helper. {caller} asked me to check on you. Can you hear me?",
      "Please say after me: the weather is nice today.",
      "Do you have chest pain or dizziness, or did you fall?",
      "Can you move your arms and legs?"
    ],
    "repeat_phrase": "the weather is nice today",
    "yes_no": "Can you hear me? Press YES or NO.",
    "caller_default": "Your family"
  }
}
```

Turn logic (`body` per 4.3: `person`, `turns`, `noReplyCount`, optional `input`):
- `lang = "en" if is_en(person) else "vi"`; `caller = person.callerName or caller_default`; `name = person.displayName`.
- `asked = number of turns with by == "AGENT"`.
- Audio input: call `assess(bytes, mime, {"locale", "expected"})` where `expected` is `repeat_phrase` when `asked == 2` (the last AGENT turn was question index 1), else `None`. On `None` (failure): `assessment = {"clarity": "NO_SPEECH", "coherent": False, "symptoms": [], "confidence": 0.0}`, `transcript` omitted, `fallback: true`. Otherwise include `transcript` and `assessment` from the result.
- `done` is true when `asked >= len(questions)`, or input is `yesNo`, or the new assessment (or any previous turn) is `SLURRED` and `asked >= 2` (enough to triage stroke).
- If not done: `next.text` = `questions[asked]` formatted, unless `noReplyCount >= 1`, then `yes_no` with `kind: "YES_NO"`; else `kind: "VOICE"`.
- First turn (no input, no turns): question 0.
- No audio is produced here (Task 4 adds voice).

- [ ] **Step 1: Tests** (`tests/test_checkin.py`) with a fake `assess`:
  - Bà Mai first turn: `next.text` starts with "Mạ ơi, Lan nhờ con hỏi thăm mạ", kind VOICE, `done` false, no `transcript`.
  - Margaret first turn (displayName "Margaret Collins", callerName "James"): starts with "Margaret Collins, it's your No One Alone helper. James asked me", English.
  - Audio answer after question 1: fake assess returns SLURRED and gets `expected == "hôm nay trời đẹp"`; reply has `transcript`, `assessment.clarity == "SLURRED"`, `done` true.
  - Assess returns `None`: `assessment.clarity == "NO_SPEECH"`, `fallback` true, next question still asked.
  - `noReplyCount == 1`: `next.kind == "YES_NO"` with the yes/no prompt.
  - `yesNo` input: `done` true, no `next`, no `transcript`/`assessment`.
  - Four AGENT turns already: `done` true.
- [ ] **Step 2: Red, implement, green.**
- [ ] **Step 3: Red edits**: ignore `noReplyCount` (YES_NO test fails); use `vi` always (Margaret test fails); drop the `None` branch (NO_SPEECH test fails); drop the SLURRED done rule (done test fails).

---

### Task 3: Plan (messages, call script, safety instruction)

**Files:** Modify `agents/respond/scripts.json`; create `agents/respond/plan.py`, `agents/respond/tests/test_plan.py`.

**Interfaces:**
- Consumes: `lang.is_en`, `lang.load_scripts`, `lang.fmt_local`.
- Produces: `plan.plan(body: dict) -> dict` returning `{"messages": [{"memberId","text"}], "callScript", "personInstruction": {"scriptIds", "text"}, "fallback": False}` (no audio; Task 4 adds it).

Add to each language in `scripts.json`:

```json
"safety": {
  "SIT_STILL": "Mạ ngồi yên, đừng cố đứng dậy.",
  "HELP_COMING": "{helper} đang tới.",
  "DOOR": "Mạ đừng khóa cửa."
},
"messages": {
  "NEARBY": "{name} có thể đang {problem}. Đi khoảng {eta} phút là tới. Mở cửa bằng chìa dự phòng nếu cần.",
  "NEARBY_NO_ETA": "{name} có thể đang {problem}. Xin đến ngay {address}.",
  "DISTANT": "{name} có thể đang {problem}. {helper} đã được báo."
},
"problems": {"EMERGENCY": "bị đột quỵ", "COME_NOW": "gặp nguy hiểm"},
"call_script": "Địa chỉ {address}. {name}. {findings}. Bình thường lần cuối {lkw}. Thuốc: {meds}. Dị ứng: {allergies}."
```

English equivalents (`"SIT_STILL": "Please sit still, don't try to get up."`, `"HELP_COMING": "{helper} is on the way."`, `"DOOR": "Leave the door unlocked if you can."`; messages `"{name} may be {problem}. You are {eta} min away. Use the spare key if needed."`, `"{name} may be {problem}. Please go to {address} now."`, `"{name} may be {problem}. {helper} has been alerted."`; problems `"having a stroke"`, `"in danger"`; call script `"Address {address}. {name}. {findings}. Last known well {lkw}. Medicines: {meds}. Allergies: {allergies}."`).

Plan rules (body per 4.3: `person`, `level`, `context`, `members`):
- `helper` = displayName of the first NEARBY in `members` order (core-api sends them by priority and notifies in that order), else `caller_default`.
- Messages: one per member; NEARBY with `etaMin` uses `NEARBY`, without uses `NEARBY_NO_ETA`; DISTANT uses `DISTANT`. Language per member's `locale` (`en*` -> en, else vi). `name` is the person's displayName.
- `callScript` in the person's language: findings (core-api sends English triage reasons) mapped through a `findings` dict in `scripts.json` for vi (`"slurred speech": "nói ngọng"`, `"no answer": "không trả lời"`, `"fall detected": "té ngã"`, `"answered no": "trả lời không ổn"`), raw string when unmapped, joined by ", "; `lkw` = `fmt_local(context.lastKnownWellAt, person.timezone)` or "unknown"/"không rõ"; meds and allergies joined by ", ".
- `personInstruction`: `EMERGENCY` -> `["SIT_STILL", "HELP_COMING", "DOOR"]`; `COME_NOW` -> `["SIT_STILL", "HELP_COMING"]`; otherwise `["HELP_COMING"]`. `text` = the chosen safety sentences joined by a space, `{helper}` filled.

- [ ] **Step 1: Tests**:
  - Bà Mai EMERGENCY with ong-hung NEARBY etaMin 6 and lan DISTANT: ong-hung's message is Vietnamese and has "6 phút"; lan's names Ông Hùng; `personInstruction.scriptIds == ["SIT_STILL","HELP_COMING","DOOR"]` and text has "Ông Hùng đang tới"; `callScript` contains "01:55" for lastKnownWellAt `2026-10-15T18:55:00Z`.
  - Margaret EMERGENCY with david (en-AU, etaMin 6) and james DISTANT: English messages; `callScript` contains "05:55" for `2026-10-15T18:55:00Z` in Australia/Sydney (AEDT UTC+11) and no Vietnamese words.
  - NEARBY member without `etaMin` uses the no-ETA message with the address.
  - Every `personInstruction.text` sentence exists in `scripts.json` (after filling `{helper}`).
  - Every template in `scripts.json` formats with the test bodies and leaves no `{` in the output (catches a placeholder core-api never sends).
- [ ] **Step 2: Red, implement, green.**
- [ ] **Step 3: Red edits**: always use vi for messages (Margaret test fails); use UTC for `lkw` (time test fails); ignore missing `etaMin` (no-ETA test fails, e.g. "None phút").

---

### Task 4: Gemini and Chirp adapters, routes, dependencies

**Files:** Create `agents/respond/gcp.py`, `agents/respond/tests/test_routes.py`; modify `agents/respond/main.py`, `agents/respond/requirements.txt`.

**Interfaces:**
- Consumes: `rules.verify`, `rules.triage`, `checkin.turn`, `plan.plan`.
- Produces: `gcp.GeminiAssessor().__call__(audio: bytes, mime: str, ctx: dict) -> dict | None`; `gcp.ChirpVoice().speak(text: str, locale: str) -> bytes | None` (MP3). Both return `None` on any error or after 15 s, and log only the exception type.

Gemini adapter:
- `genai.Client(vertexai=True, project=os.environ.get("GOOGLE_CLOUD_PROJECT") or google.auth.default()[1], location=os.environ.get("GEMINI_LOCATION", "global"), http_options=types.HttpOptions(timeout=15_000))` (timeout in ms; Cloud Run does not set the project env, the metadata server gives it through `google.auth.default`). Model env `GEMINI_MODEL` default `gemini-2.5-flash`. Config: `temperature=0`, `thinking_config=types.ThinkingConfig(thinking_budget=0)`, `response_mime_type="application/json"`, `response_schema` as a plain dict with `"enum"` for clarity. Audio part: `types.Part.from_bytes(data=audio, mime_type=mime)` (browser sends `audio/webm`).
- One `generate_content` call with the audio part and a short instruction: transcribe in the given locale, judge `clarity` as CLEAR, SLURRED or NO_SPEECH, `coherent` true/false, `symptoms` from a fixed list (`chest pain`, `dizziness`, `fall`, `headache`, `weakness`, `cannot stand`), `confidence` 0..1; when `expected` is given, SLURRED if the repetition is garbled. Use `response_mime_type="application/json"` and a response schema. Validate the result; anything off-schema returns `None`.

Chirp adapter:
- `google.cloud.texttospeech.TextToSpeechClient`, `synthesize_speech(..., timeout=15.0)` (seconds), voices `vi-VN-Chirp3-HD-Aoede` and `en-AU-Chirp3-HD-Aoede` (if a voice name is rejected at runtime, list voices for the locale once and pick the first `Chirp3-HD`), MP3, speaking rate 0.9.

Routes (`main.py`):
- `/verify` -> `rules.verify(body)`.
- `/triage` -> `rules.triage(body)`.
- `/checkin/turn` -> `checkin.turn(body, assessor)`; if `next` exists, `audio = voice.speak(next.text, locale)`; add `audioBase64` and `mimeType: "audio/mpeg"` when audio is not `None`, else set `fallback: true`.
- `/plan` -> `plan.plan(body)`; speak `personInstruction.text` the same way.
- Module-level `assessor = gcp.GeminiAssessor()` and `voice = gcp.ChirpVoice()`; their `__init__` does nothing and the Google client is built on first call, so `import main` works without credentials (CI) and tests monkeypatch `main.assessor` / `main.voice`. New routes are plain `def` (sync clients run in the threadpool).
- Any unexpected exception in a route: return the rule-only result with `fallback: true` where possible; never 500 for verify/triage/plan (wrap in try/except and fall back to the stub-like safe reply: verify `isReal: true`, triage `EMERGENCY`, plan template without audio).
- `/health` and `/handoff` unchanged.

`requirements.txt`: already pinned in Task 0.

- [ ] **Step 1: Tests** (`tests/test_routes.py`) with `TestClient` and monkeypatched `main.assessor` / `main.voice`:
  - `/checkin/turn` first turn with a fake voice returning `b"mp3"`: `next.audioBase64 == base64("mp3")`, `mimeType "audio/mpeg"`, `fallback` false.
  - Voice returns `None`: `next.text` present, no `audioBase64`, `fallback` true.
  - `/plan` speaks `personInstruction` the same way.
  - `/verify` and `/triage` return rule results for the stroke fixture body.
  - `rules.triage` raising (monkeypatch) gives `200` with `level: "EMERGENCY"`, `fallback: true`.
  - `import main` with no Google credentials works (lazy adapters).
  - Existing `/handoff` tests stay green.
- [ ] **Step 2: Red, implement, green.** Also run `.venv\Scripts\python -c "import main"`.
- [ ] **Step 3: Red edits**: drop the `None` audio branch (TTS-down test fails); remove the triage try/except (500 test fails).
- [ ] **Step 4: Live smoke (optional, controller after deploy)**: not in this task.

---

## After the last task

- Controller reads the final diff and runs the whole respond suite.
- Ship needs Dũng's approval (given: design approved; ship asked separately). After merge, Deploy rebuilds respond-agent. Check the respond-agent service account can call Vertex AI (`roles/aiplatform.user`, granted in `setup.ps1`) and Text-to-Speech (no extra role expected; if 403, report the exact error).
- Smoke: reset, stroke demo for `ba-mai` and `margaret`, send a recorded audio answer, check `checkIn.pending.audioPath`, `assessment`, `level`, `personInstruction`.
