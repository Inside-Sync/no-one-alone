# Speech check voice, goodbye and replay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Nana's feedback on 2026-10-18: (1) Noa tells Margaret the speech check result out loud; (2) the happy case ends with a polite spoken goodbye instead of going silent; (3) the Speech Check card shows a clear pass or fail; (4) a button replays the speech check so judges can try other answers.

**Architecture:** (1) respond-agent `plan.py`: when the findings include slurred speech, the person instruction (already spoken on Margaret's phone with Chirp audio) starts with the result line. (2) respond-agent `/triage` returns a `closing` {text, audioBase64} for OK and MONITOR; core-api `finishCheckIn` saves the audio and stores it as `personInstruction` on the closed incident; web `phoneView` shows and plays it on a closed OK/MONITOR incident. (3) and (4) are web edits in `SpeechCheckCard.tsx` (Hai's card; the user approved this edit and Hai is told).

**Tech Stack:** FastAPI + pytest (agents/respond), Spring Boot + JUnit (core-api), React + vitest (web).

**Spec:** Nana's feedback message (2026-10-18) and Claude Doc 8xmbVzH5Bnmq3r9GXT9rAQ section 2 (Green).

## Global Constraints

- Exact lines (English persons; Vietnamese persons get a natural Vietnamese version in `scripts.json` "vi"):
  - Slurred result, first sentences of the instruction: `Your voice doesn't sound as clear as normal. It seems you are experiencing sudden slurred speech. Please stay still while I reach out to your family.` The existing instruction text follows it.
  - Goodbye (OK and MONITOR): `That's all right, {name}. Let's take five slow breaths together… in… and out. Have a sip of water and sit somewhere comfy. I'll check on you again in 10 minutes. Goodnight, {name}.`
- Never say "stroke" to Margaret.
- core-api start/escalation flow is unchanged for COME_NOW and EMERGENCY.
- Comments one line. No AI attribution. Each test names its red production edit; record red output in `.superpowers/sdd/2026-10-18-speech-check-voice/checks.md` (revert from a backup copy, never `git checkout` a file with uncommitted work).

## Review Focus

- The slurred line plays before Noa's status lines and the 000 dialogue on Margaret's phone (it is the instruction clip, which is already queued first).
- A TTS failure in triage still closes the incident (closing without audio is fine; the text still shows).
- The goodbye plays once, not again on reload of a closed incident (use the same "live vs seen at load" rule LivePhoneCard already applies to instruction audio; read it).
- Ba Mai (vi) still works.
- The replay button never runs while a start is in flight.

---

### Task 1: respond-agent lines

**Files:** `agents/respond/{plan.py,rules.py,main.py,scripts.json}`, tests under `agents/respond/tests`.

- `scripts.json`: add `speech_result` and `goodbye` for "en" and "vi".
- `plan.py`: when the context findings contain slurred speech (read how `rules.triage` names it, e.g. `"slurred speech"`), `instruction = speech_result + " " + instruction`.
- `main.py` `/triage`: after `rules.triage`, when level is OK or MONITOR, add `closing = {"text": goodbye.format(name=first name)}` and `add_audio(closing, locale)`; a TTS failure leaves `closing` without audio.
- Tests: plan with slurred findings starts with the result line [red: skip the prefix]; plan without slurred has no prefix; triage OK returns closing text with the name [red: no closing]; triage EMERGENCY has no closing.
- Run `pytest -q` in agents/respond.

### Task 2: core-api stores the goodbye

**Files:** `core-api/.../agent/TriageResult.java` (add optional `closing` {text, audioBase64}), `flow/IncidentFlow.java` `finishCheckIn`, tests `IncidentFlow*Test`.

- On OK/MONITOR with a closing: save audio via `audio.save(incidentId, "closing.mp3", bytes, "audio/mpeg")` (catch and log on failure), then in the mutation set `x.personInstruction` with text and audioPath (check the PersonInstruction model; scriptIds empty) and log `ASKED`-style is not needed.
- Tests: OK triage with closing stores personInstruction text and audioPath [red: drop the assignment]; EMERGENCY path unchanged.
- Run `mvn -q test`.

### Task 3: web plays the goodbye, clear verdict, replay button

**Files:** `web/src/domain/incident.ts` (`phoneView` CLOSED OK/MONITOR branch), `web/src/features/individual/live/SpeechCheckCard.tsx`, `web/src/features/individual/live/LivePage.tsx` only to pass a replay callback, `web/src/locales/{en,vi}/live.json`, tests.

- `phoneView`: CLOSED with OK/MONITOR returns `q: instr?.text ?? ph('glad')`, `audioPath: instr?.audioPath ?? null`, `questionKey: instr ? 'closing' : null`. Check LivePhoneCard plays audio for this shape; adjust only if needed.
- SpeechCheckCard: once a verdict exists, a large verdict banner: pass = green check `Passed · speech is clear` with `clarity {x} · her normal 0.94`; fail = red cross `Failed · slurred speech` with the same numbers. Keep the existing table. Use existing CSS tokens (var(--bad), var(--good) or the card's colours).
- Replay: button `↺ Run the speech check again` on the card once a verdict exists; it calls a prop `onReplay` that LivePage wires to the existing Night alert demo path (reset the incident, then load the night preset), disabled while busy.
- Tests: phoneView closed OK with instruction returns its text and audio [red: keep ph('glad')]; SpeechCheckCard shows `Failed · slurred speech` for a SLURRED turn and `Passed` for CLEAR [red: hide the banner]; clicking replay calls onReplay [red: drop onClick].
- Run in web/: `npx tsc -b`, eslint `--quiet`, vitest (VITE_API_BASE unset).

- [ ] Commit per task: `feat(respond): Noa tells Margaret the speech check result and says goodbye when she is fine`, `feat(core-api): keep the goodbye line for a closed check-in`, `feat(web): clear speech check verdict, replay button, goodbye on her phone`.

## Opus plan review folded in (overrides the text above)

- Critical: `/triage` gets no person today. `IncidentFlow.triageBody` adds `"person": {displayName, locale, dialect}` (copy the shape from `turnBody`). In `main.py` build the closing in its own try/except after `rules.triage`, reading `body.get("person")`; any failure leaves the level untouched.
- `TriageResult`: add `record Closing(String text, String audioBase64)` and a 3-arg constructor that passes `closing = null`, so the 14 existing call sites compile unchanged.
- LivePhoneCard has no seen-at-load rule for this: `const played = useRef(phone.questionKey === 'closing' ? phone.audioPath : null)` so a closing present at mount never plays. Test: a card mounted with closing audio plays nothing [red: init played with null].
- SpeechCheckCard already has `.spk-verdict` (line ~96): extend that banner with the pass/fail text and the clarity numbers (from `METRICS[0]`), do not add a second banner. NO_SPEECH already maps to slurred; accept that.
- Replay: wire `onReplay` to `nightDemo.current()` and pass `busy`; ignore the double-reset edge.
- plan.py: test the raw `ctx["findings"]` list for `"slurred speech"` (named at `rules.py:58`).
