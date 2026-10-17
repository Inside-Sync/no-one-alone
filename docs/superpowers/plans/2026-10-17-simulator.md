# Emergency Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the Emergency tab, a Simulator card and a Live readings chart let a presenter pick a scenario, heart rate, movement and speech, then run the real agents end to end.

**Architecture:** core-api's demo start accepts optional `hr` and `movementMin` overrides for the alert. The web builds a simulated 40-minute reading series from the controls for the chart, starts the demo with the overrides, and an autopilot hook answers Margaret's check-in with pre-recorded Chirp clips and accepts for David when asked to. Rules, call order and timers stay as they are on dev.

**Tech Stack:** Spring Boot 3.3 (core-api, Testcontainers Firestore), React + Vite + i18next + vitest (web), Chirp 3 HD clips generated once and committed as MP3.

**Spec:** Nana's prototype (https://claude.ai/artifact/2BX1DcwoUiWjFgeaK6mVyy, Emergency tab) and the design Dũng approved on 17/10: real agents, current verify rule (HR at least baseline + 30 and still at least 2 min), current call order (NEARBY David then Aisha, DISTANT James and Sarah notified).

## Global Constraints

- Code, comments, commits in English. Comments at most one line. No AI attribution.
- Every test step names the production edit that turns it red; record the red output in `.superpowers/sdd/2026-10-17-simulator/checks.md`.
- en and vi strings for every new label (`web/src/locales/{en,vi}/live.json`).
- Mobile: no horizontal scroll at 360 px; controls are real buttons/inputs with labels.
- Demo timers stay as on dev: nearby timer 3 s, no-reply 10 s.
- One live tab only; nothing here may send a check-in twice for the same question.

## Review Focus

1. Autopilot answering the same question twice (snapshot re-renders, StrictMode) must send exactly one check-in per question key.
2. The first question plays after a 4 s ring plus ~3 s of speech: the autopilot must not answer before the question is heard, and must answer before the no-reply timer.
3. Overrides out of range (hr 0, movementMin 500, strings) return 400 `INVALID_REQUEST` and start nothing.
4. "Sound asleep" (HR 57, still 45 min) must give FALSE_ALARM, not EMERGENCY.
5. Reset or F5 mid-run stops the autopilot timers (no answers posted to a deleted incident).

---

### Task 1: core-api alert overrides

**Files:**
- Modify: `core-api/src/main/java/com/noonealone/coreapi/web/ApiController.java` (DemoRequest, trigger)
- Modify: `core-api/src/main/java/com/noonealone/coreapi/flow/DemoService.java` (trigger signature)
- Test: `core-api/src/test/java/com/noonealone/coreapi/web/ApiControllerTest.java`, `.../flow/DemoServiceTest.java`
- Docs: `docs/contract.md` section for `POST /api/demo/{scenario}` (around line 314)

**Interfaces:**
- Produces: `DemoRequest(Integer timerSeconds, Integer noReplySeconds, String personId, Integer hr, Integer movementMin)`. `DemoService.trigger(Scenario, String personId, int timerSeconds, int noReplySeconds, Integer hr, Integer movementMin)`; null means use the fixture value. Keep a 4-arg overload delegating with nulls so existing callers and tests compile.
- Validation in the controller: `hr` 30..220, `movementMin` 0..120, else `ApiException.badRequest`.

- [ ] Test (DemoServiceTest): trigger STROKE for margaret with hr 57, movementMin 45; the published `AlertMessage` (captured from the publisher mock or the stored incident `alert`) has hr 57 and movementMin 45. Red edit: ignore the overrides in DemoService.
- [ ] Test (ApiControllerTest): body `{"personId":"margaret","hr":500}` returns 400 and `demo.trigger` is never called. Red edit: drop the range check.
- [ ] Test (ApiControllerTest): body with `hr` 120 and `movementMin` 10 calls the 6-arg trigger with those values.
- [ ] Implement; run `mvn -q test` (Docker must be up); record totals.
- [ ] Contract: document `hr` and `movementMin` as optional overrides of the scenario alert.

Also in Task 1: `agents/respond/rules.py` verify reason when not real and `movementMin >= 2`: `HR {hr} near her baseline {baseline}, resting: not an emergency` (today it says "with movement: active", wrong for Sound asleep). Test in `agents/respond/tests/test_rules.py`; red edit: restore the old string.

### Task 2: web simulator domain and API plumbing

**Files:**
- Create: `web/src/domain/simulator.ts`
- Modify: `web/src/data/api.ts` (`startDemo` gains `overrides?: { hr?: number; movementMin?: number; noReplySeconds?: number }`; noReplySeconds overrides the default 10), `web/src/data/repo.ts` (`startDemo(scenario, overrides?)`), `web/src/state/LiveIncident.tsx` (`start(scenario, overrides?)`)
- Test: `web/tests/domain/simulator.test.ts`

**Interfaces (produces):**
```ts
export type SimPreset = 'night' | 'stairs' | 'asleep'
export type SimSpeech = 'clear' | 'slurred' | 'none'
export interface SimSettings { preset: SimPreset; hr: number; moving: boolean; stillMin: number; speech: SimSpeech; davidPicksUp: boolean }
export function presetSettings(p: SimPreset): SimSettings
// night: hr 142, moving false, stillMin 4, speech 'slurred', david false
// stairs: hr 136, moving true, stillMin 0, speech 'clear'
// asleep: hr 57, moving false, stillMin 45, speech 'clear'
export function scenarioFor(s: SimSettings): DemoScenario   // night and asleep -> 'stroke', stairs -> 'false-alarm'
export function overridesFor(s: SimSettings): { hr: number; movementMin: number }  // movementMin = moving ? 0 : stillMin
export function noReplySecondsFor(s: SimSettings): number  // 15 when the autopilot answers with clips, 10 for 'none'
export function clipFor(s: SimSettings, questionIndex: number): string | null
// none -> null; clear -> `/sim/clear-${i}.mp3` (i 0..3); slurred -> i 0 clear-0, i 1 slurred-1, else null
export interface Reading { minute: number; hr: number; moving: boolean } // minute -39..0
export function simSeries(s: SimSettings, baseline: number): Reading[]  // 40 points, deterministic
export function ruleChecks(s: SimSettings, baseline: number): { still: boolean; hr: boolean; threshold: number } // threshold = baseline + 30, still = !moving && stillMin >= 2
```
- `simSeries`: points before the still period hover at baseline + small deterministic wobble (no Math.random); the last `min(stillMin, 40)` points are not moving; when `hr >= threshold` the last 6 points ramp up to `hr`.

- [ ] Tests: presets values; `scenarioFor`; `overridesFor(moving)` gives movementMin 0; `simSeries` has 40 points, ends at `hr`, last stillMin points have `moving: false`, two calls are equal; `ruleChecks` for night (both true) and asleep (hr false). Red edit for each: break the matching branch.
- [ ] `startDemo` sends `hr`/`movementMin` only when given (test in `web/tests/data/api.test.ts` if it exists, else alongside the repo tests, mocking fetch). Red edit: drop the fields from the body.

### Task 3: Simulator and Live readings cards

**Files:**
- Create: `web/src/features/individual/live/SimulatorCard.tsx`, `web/src/features/individual/live/LiveReadingsCard.tsx`
- Modify: `web/src/features/individual/live/LivePage.tsx` (idle and closed states render `SimulatorCard` (c5) + `LiveReadingsCard` (c7) instead of `LiveIdleCard`; settings state lives in `LiveIncidentPage` so it survives the incident), `web/src/locales/en/live.json`, `web/src/locales/vi/live.json`
- Test: `web/tests/features/individual/simulator.test.tsx`

**Behaviour:**
- Preset chips (Night emergency, Climbed stairs, Sound asleep) apply `presetSettings`. Heart rate slider 40..180, Movement toggle Moving / Not moving, Not moving for slider 0..45 (disabled while Moving), Speech Clear / Slurred / No answer, David picks up Yes / No. Buttons Start and Reset (reset calls the existing `reset`).
- Start calls `start(scenarioFor(s), { ...overridesFor(s), noReplySeconds: noReplySecondsFor(s) })`; errors toast like `LiveIdleCard` does.
- Live readings: reuse `components/charts/LineChart.tsx` if it fits (HR line, dashed alert line at `threshold`), a movement strip (one cell per minute, brand colour when moving, muted when not), and two check chips: "Not moving for 2 min or more" and "Heart rate at least {threshold} (30 above her baseline)", each ticked from `ruleChecks`. Label the card "Simulated readings". Baseline comes from `people.person.baseline.nightHr` with 57 as fallback.
- While an incident is open the cards stay visible below the existing three cards, with controls disabled except Reset.

- [ ] Tests: clicking "Sound asleep" sets the HR value text to 57; Start with Night emergency calls `start('stroke', { hr: 142, movementMin: 4, noReplySeconds: 15 })`; Moving disables the still slider; both check chips ticked for Night and HR chip unticked for Sound asleep. Red edit per test.
- [ ] 360 px: checked in the browser pane during Task 5 (no new e2e).

### Task 4: Autopilot answers and pick-ups

**Files:**
- Create: `web/public/sim/clear-0.mp3` .. `clear-3.mp3`, `web/public/sim/slurred-1.mp3` (generated with Chirp en-AU-Chirp3-HD-Aoede; the generator script stays outside the repo, list the texts in the hook as constants)
- Create: `web/src/features/individual/live/useAutopilot.ts`
- Modify: `LivePage.tsx` (call the hook with settings, incident, view, checkin, act), `LivePhoneCard.tsx` only if needed to report a manual answer
- Test: `web/tests/features/individual/autopilot.test.ts` (fake timers, mocked fetch for the clip, mocked checkin/act)

**Clips (texts):** clear-0 "Yes, I can hear you.", clear-1 "The weather is nice today.", clear-2 "No, I don't think so.", clear-3 "Yes, I can move them.", slurred-1 "Thuh... wezzuh... ish... nysh... tuh-dey."

**Behaviour:**
- Clips are already generated and verified with the real GeminiAssessor (Margaret voice en-AU-Chirp3-HD-Gacrux; status clips use the agent voice Aoede): clear-0..3 CLEAR, slurred-1 SLURRED 0.8.
- Active only when the incident was started from the Simulator in this tab (flag set on Start, cleared on reset or when the incident closes).
- For each new pending VOICE question (key = `view.phone.questionKey`, format `${turns}:${noReplyCount}:${text}`), wait 8 s for the first question (ring 4 s plus speech) and 4 s for later ones, then post `clipFor(settings, index)` where index = number of AGENT turns in `incident.checkIn.turns` minus 1. Null clip sends nothing (the no-reply path runs).
- When sending, also play the clip locally (`new Audio(url).play()`, errors ignored) so the audience hears Margaret.
- A `sent` ref per key makes it send at most once (StrictMode safe). Swallow `INVALID_STATE` from the server (a manual answer got there first). No other cancel logic.
- David picks up Yes: when David's assignment becomes NOTIFIED, call `act('david', 'ACCEPT')` 1.5 s later (timer is 3 s). A late accept is allowed by the server.
- All timers cleared on unmount, reset and incident change.

- [ ] Tests: one send per key across re-renders; none sends nothing; David accept after 1.5 s only when Yes. Red edit per test.

### Task 6: Margaret hears what NOA is doing (feedback 17/10)

**Goal:** Margaret's screen and speaker say what the helper is doing after the plan: who it is calling, that someone did not answer and who is next, who is on the way, and that it is calling 000. The 000 call rings like the family calls.

**Files:**
- Modify: `web/src/domain/incident.ts` (new pure `helperStatus(inc, people)`; `phoneView` exposes `status: { text: string; clip: string | null; key: string } | null`)
- Modify: `web/src/features/individual/live/LivePhoneCard.tsx` (status line under the instruction, plays `clip` once per key after the current audio ends), `web/src/features/individual/live/ring.ts` (`callKeys` also returns `CALLED_115` entries so the 000 call rings)
- Modify: `web/src/locales/{en,vi}/live.json`
- Assets (already generated, voice en-AU-Chirp3-HD-Aoede like the agent): `web/public/noa/calling-david.mp3`, `calling-aisha.mp3`, `no-answer-david-calling-aisha.mp3`, `on-the-way-david.mp3`, `on-the-way-aisha.mp3`, `calling-000.mp3`
- Test: `web/tests/domain/incident.test.ts`, `web/tests/features/individual/ring.test.ts`

**Rules for `helperStatus`** (latest escalation event wins; first names from `people`):
- `NOTIFIED` "Calling {X}..." with no earlier `EXPIRED`/`DECLINED`: text "I'm calling {X} now. Please stay where you are." clip `/noa/calling-{x}.mp3`
- `NOTIFIED` "Calling {X}..." right after `EXPIRED`/`DECLINED` of {P}: "{P} didn't answer. I'm calling {X} now." clip `/noa/no-answer-{p}-calling-{x}.mp3`
- `ACCEPTED` by {X}: "{X} is on the way. Help is coming." clip `/noa/on-the-way-{x}.mp3`
- `CALLED_115` (SYSTEM): "No one nearby can come, so I'm calling {num} for an ambulance now. Stay where you are. Help is coming." clip `/noa/calling-000.mp3` only when num is 000
- otherwise null. Clip names exist only for Margaret's circle (david, aisha); `clip` is null when the file is not in a fixed list, then the screen shows text only. vi strings for the text (Bà Mai), no vi clips.
- key = the event's `at` + `kind` + member, so each update plays once.

- [ ] Tests: each rule above on a small timeline; unknown member gives clip null; `callKeys` includes a CALLED_115 entry. Red edit per test.
- [ ] The status line and audio do not interrupt the question audio during check-in (status is null until the plan's instruction exists).

### Task 5: Verify on prod and runsheet

- [ ] Ship (PR to dev), merge when CI is green, wait for deploy.
- [ ] Note: Night + Clear closes as MONITOR by design (clear answers). In the browser pane, one tab, `/individual/live`: Night emergency + Slurred + David No gives EMERGENCY, Sydney Stroke Center, calls David then Aisha, auto 000. Sound asleep gives FALSE_ALARM. Climbed stairs gives FALSE_ALARM.
- [ ] Update the private runsheet artifact with the Simulator scenes.
