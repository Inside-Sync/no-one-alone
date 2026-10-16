# Recovery plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** After the hospital receives the handoff, staff open the case, create a recovery plan (medicines with times, activities, follow-ups, doctor's notes) and send the person home. The respond-agent turns the plan into plain-language reminders with Chirp audio, core-api stores them on the incident, and Margaret's "My day" page shows the plan and the next reminder by her local time.

**Architecture:** One new public route `POST /api/incidents/{id}/recovery` in core-api. It calls a new respond-agent route `POST /recovery`, saves reminder audio like the person instruction, writes `incident.recovery`, logs `DISCHARGED` and closes the incident. The web reads `incident.recovery` from the live incident it already follows. No new Firestore collection: reset already deletes the incident.

**Tech Stack:** core-api Spring Boot 3.3 / Java 17; respond-agent FastAPI + Gemini 2.5 Flash + Chirp 3 HD; web React + Vite + i18next.

**Spec:** Dũng's request in chat 16/10 21:20 and the options he chose: "bản gọn, làm ngay", reminders shown on the page (no push). Contract: `docs/contract.md`.

## Global Constraints

- Shapes exactly as in "Contract additions" below. Absent optional fields are omitted, never `null`.
- Medicine names, doses, times and follow-ups come only from what staff entered. Gemini only writes the warm `summary` paragraph; on any Gemini failure `summary` is the staff `notes` verbatim and `fallback` is true. Reminder text is built by rules, never by Gemini.
- Times are `HH:mm` in the person's timezone (`person.timezone`).
- Language follows `person.locale` (`en*` English, else Vietnamese with "mạ"/"con").
- core-api never fails the discharge because the agent failed: it builds rule reminders itself and sets `recovery.fallback: true`.
- No patient data in logs. Comments at most one line. Docs: short plain sentences, no em-dashes.
- Every new test names a red edit; the implementer applies it, pastes the failing line into `.superpowers/sdd/2026-10-16-recovery-plan/checks.md`, reverts.

## Contract additions (controller writes these into docs/contract.md before Task 1)

**4.1 `POST /api/incidents/{id}/recovery`** from the hospital screen.

```json
{
  "staffName": "Dr Nguyen, Sydney Stroke Center",
  "diagnosis": "Ischaemic stroke, treated with clot-busting medicine",
  "meds": [
    { "name": "aspirin", "dose": "100 mg", "times": ["08:00"] },
    { "name": "atorvastatin", "dose": "40 mg", "times": ["20:00"] },
    { "name": "amlodipine", "dose": "5 mg", "times": ["18:00"] }
  ],
  "activities": [
    { "text": "Walk for 15 minutes with your stick", "times": ["10:00", "16:00"] },
    { "text": "Speech exercises from your sheet", "times": ["11:00"] }
  ],
  "followUps": [
    { "text": "GP check with Dr Patel", "inDays": 7 },
    { "text": "Stroke clinic review", "inDays": 42 }
  ],
  "notes": "No driving for 4 weeks. Call 000 at once if face, arm or speech changes again."
}
```

Rules: `meds` and `activities` may be empty but not both; every `times` entry matches `^([01]\d|2[0-3]):[0-5]\d$`; `inDays` 1 to 365; strings at most 300 chars; at most 10 meds, 10 activities, 5 follow-ups. Otherwise `400 INVALID_REQUEST`. Allowed only when `handoff` is present (any status, so the demo works when hospital-agent is down) and `recovery` is absent; otherwise `409 INVALID_STATE`. Response `200 { "version": n }`.

Effect: incident gets `recovery` (2.3), timeline `DISCHARGED` by `HOSPITAL` with text `Discharged home with a recovery plan by {staffName}`, `status: CLOSED`.

**2.3 `incidents/{id}.recovery`**

```json
{
  "createdAt": "2026-10-16T05:10:00Z",
  "staffName": "...", "diagnosis": "...", "notes": "...",
  "meds": [ ... as sent ... ], "activities": [ ... as sent ... ],
  "followUps": [ { "text": "GP check with Dr Patel", "inDays": 7, "date": "2026-10-23" } ],
  "summary": "Margaret, you are home. Your doctors treated a small stroke ...",
  "summaryAudioPath": "audio/{incidentId}/recovery-summary.mp3",
  "reminders": [
    { "time": "08:00", "kind": "MED", "text": "Time for your aspirin, 100 mg.", "audioPath": "audio/{incidentId}/recovery-0.mp3" },
    { "time": "10:00", "kind": "ACTIVITY", "text": "Time to walk for 15 minutes with your stick." }
  ],
  "fallback": false
}
```

`followUps[].date` is the person's local date of `createdAt` plus `inDays`; `createdAt` is the `now` that `store.mutate` passes (story time), and the date uses that same instant. `reminders` is sorted by `time`, one per (item, time). `audioPath` and `summaryAudioPath` are present only when audio was saved.

**4.3 respond-agent `POST /recovery`**

Body: `{ "person": { "displayName", "locale", "timezone" }, "plan": <the 4.1 body> }`.
Reply: `{ "summary": "...", "summaryAudioBase64"?: "...", "reminders": [ { "time", "kind", "text", "audioBase64"? } ], "fallback": bool }`, `mimeType` is always `audio/mpeg`.

Reminder text templates in `scripts.json` (`recovery` key per language):
- en: MED `"Time for your {name}, {dose}."`, ACTIVITY `"Time to {text_lower}."` (first letter lowercased).
- vi: MED `"Mạ ơi, tới giờ uống {name} {dose} rồi."`, ACTIVITY `"Mạ ơi, tới giờ {text_lower} rồi."`.

Summary: Gemini writes at most 3 short sentences addressed to the person (by `displayName` in English, "mạ" in Vietnamese) that restate the diagnosis and notes in plain words. Prompt forbids adding medicines, doses, advice or anything not in the plan. Gemini failure: `summary = notes`, `fallback: true`. Chirp failures drop audio only.

## Review Focus

1. Agent down or slow: discharge still succeeds with rule reminders and `fallback: true`. Test in Task 2.
2. Staff time typo ("8:00", "25:00"): `400 INVALID_REQUEST`, nothing written. Test in Task 2.
3. Second "Send home" click: `409 INVALID_STATE`, the first plan stays. Test in Task 2.
4. Margaret opens My day after 20:00: "next reminder" rolls to tomorrow's first one, not empty. Test in Task 4.
5. A Gemini summary that names a medicine not in the plan: rejected, notes used instead. Test in Task 1.

## Tasks

Order: controller writes the contract (docs/contract.md, web `data/contract.ts` types, `DISCHARGED` in `TimelineKind` and `PHASE` in `domain/incident.ts`), then Tasks 1, 2 and 3+4 run in parallel (disjoint folders). Task 2 depends only on the contract shape of `/recovery`, mocked in its tests.

### Task 1: respond-agent `/recovery` (agents/respond)
**Files:** create `recovery.py`, `tests/test_recovery.py`; modify `scripts.json`, `gcp.py` (a `summarize(prompt_ctx) -> str | None` method on `GeminiAssessor` or a small `GeminiWriter`), `main.py` (route).
- `recovery.reminders(person, plan) -> list[dict]` pure: one reminder per item/time, sorted by time, templates above.
- `recovery.summary(person, plan, write) -> (text, fallback)`: calls `write`; reject output (fallback to notes) if empty, longer than 400 chars, or it contains a medicine-like word not in `plan.meds[].name` (check: any word from a small list `["aspirin","atorvastatin","amlodipine","warfarin","apixaban","clopidogrel","metformin","paracetamol","ibuprofen","insulin"]` that is not in the plan).
- Route `/recovery`: build reminders and summary, add Chirp audio to each reminder and the summary (`voice.speak`, locale from `gcp.locale_for(person)`), never raise: on unexpected error return 503 so core-api falls back.
- Gemini call: same client and config as `GeminiAssessor` (temperature 0, thinking budget 0, 15 s), text only, plain text response.
- Tests (red edit each): reminders sorted and one per time, input lists 20:00 before 08:00 (red: drop the sort); en and vi templates (red: always en); summary rejection of an unlisted medicine (red: remove the check); writer returns None gives notes + fallback (red: on None set summary to "" instead of notes); route adds audio when voice returns bytes and survives voice None (monkeypatch `main.voice`, a fake writer).

### Task 2: core-api `POST /api/incidents/{id}/recovery` (core-api)
**Files:** `web/ApiController.java` (route + request records), new `flow/Recovery.java` service, `agent/RespondAgentClient.java` (`recovery(Map) -> RecoveryResult`), new `agent/RecoveryResult.java`, new `model/RecoveryInfo.java` (+ nested records/classes as the model package does), `model/Incident.java` (`recovery` field), tests `CT/flow/RecoveryTest.java` (FirestoreTestBase style like ActionsTest) and an `ApiControllerTest` case.
- Validation per contract, before any write. 409 when handoff is missing/not RECEIVED or recovery present (check inside `store.mutate` too, race-safe).
- Call the agent outside the transaction; on `AgentException` build reminders in Java with the English or Vietnamese template (same strings as Task 1) and `summary = notes`, `fallback = true`.
- Save audio with the existing audio store (`audio.save(incidentId, "recovery-{i}.mp3", bytes, "audio/mpeg")`, `recovery-summary.mp3`), best effort like the instruction audio in `Escalation.java:83-90`.
- `followUps[].date` = local date of now in `person.timezone` + `inDays`.
- In `mutate`: set `recovery`, `log(now, "HOSPITAL", "DISCHARGED", ...)`, `status = CLOSED`, and cancel any pending escalation timer like `Actions.java:155` (`tasks.deleteQuietly(x.escalationTaskName)`).
- `ApiControllerTest` is a `@WebMvcTest` slice: add `@MockBean Recovery recovery` there.
- `AudioStore.save(incidentId, fileName, bytes, contentType)` already returns null on failure; no extra try/catch.
- Tests (red edit each): happy path stores recovery, timeline and CLOSED (red: skip status); agent throws gives fallback reminders sorted, with the 20:00 med listed before the 08:00 med in the request (red: no sort); bad time 400 and nothing written (red: drop the regex); second call 409 (red: drop the recovery-present check); no handoff 409.
- Run `mvn -q -B clean verify` (long-runner).

### Task 3: hospital "Recovery plan" card (web)
**Files:** `features/hospital/ed/RecoveryCard.tsx` (new), `EdPage.tsx`, `data/api.ts` + `data/repo.ts` (`recovery(incidentId, body)`), `locales/{en,vi}/hospital.json` (labels only), tests under `web/tests/features/hospital/`. Types `RecoveryRequest`, `RecoveryDoc`, `IncidentDoc.recovery` are already in `data/contract.ts` (controller); do not edit contract.ts.
- Shown in live mode when `incident.handoff` exists. Prefilled from a `DEFAULT_PLAN` constant in `RecoveryCard.tsx` equal to the request example above (labels in locales, plan values in English). Staff edit plain inputs: one row per med (name, dose, times comma-separated), activities (text, times), follow-ups (text, days), notes, staff name. Button "Send home with this plan". After success, or if `incident.recovery` exists, show "Sent home at {time}" and the reminders read-only.
- Errors: 400/409 show a toast with the message; keep the form.
- Tests (vitest + testing-library, red edit each): form posts the parsed body (times split and trimmed) when clicked (red: send raw string); hidden when there is no handoff (red: drop the condition); read-only view when recovery exists.

### Task 4: Margaret "Your recovery plan" on My day (web)
**Files:** `features/individual/me/RecoveryCard.tsx` (new), `MePage.tsx`, `domain/recovery.ts` (new, pure), `locales/{en,vi}/me.json`, tests under `web/tests/`. Do not edit contract.ts. `MePage` gets the incident from `useLiveIncident()` (same provider as the live page).
- `nextReminder(reminders, nowMs, tz) -> {reminder, tomorrow: boolean} | null`: first reminder with time >= local now, else the first one tomorrow.
- Card (live mode, `incident.recovery` present): summary (play button for `summaryAudioPath` via `repo.audioUrl`), a large "Next: {time} {text}" block with a play button for its audio, "I've done it" marks it done for today (local state) and moves to the next, today's list with times, follow-ups with dates, doctor's notes. Clock: the real wall clock (`Date.now()`) in `people.person?.timezone ?? 'Australia/Sydney'`, re-evaluated every 30 s. No auto-play and no due-window highlight tonight.
- 28 pt-friendly sizes are not required here (this is the family/own app page), but keep text readable in the night theme (use tokens).
- Tests (red edit each): `nextReminder` picks the next slot, rolls to tomorrow after the last one (red: return null), uses the person's timezone (red: use UTC); card renders summary and next reminder from a sample `recovery`.

## After the tasks
Controller: read the whole diff, run all three suites, Fable branch review, then ask Dũng to ship. After deploy: run the Margaret stroke demo (slurred), open the hospital ED page in ONE tab (close the live page first), send home, check My day.
