# Simulator like the artifact (one preset) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** The Emergency tab Simulator works like the presenter's artifact: heart-rate and not-moving sliders, a live readings chart that ticks one reading per sim minute, a rule card that counts to 10, and Noa starts the real incident by itself when the rule is met. Only the `Night emergency` preset ships; the data shape takes `stairs` and `asleep` later without UI changes.

**Architecture:** Pure watch functions in `web/src/domain/simulator.ts` (tick, sliders, rule run, note, presets). A `useWatch` hook owns the ticking state and fires `onAlert` from the interval or slider handler, never from an effect. `SimulatorCard` renders presets, how-to, sliders, more options and run controls; `LiveReadingsCard` renders the watch. `LivePage` wires them and keeps the existing start/autopilot path.

**Tech Stack:** React 19, TypeScript, i18next (en, vi), vitest + Testing Library.

**Spec:** `docs/superpowers/plans/2026-10-17-noa-ui-spec.md` section 4.1 and 4.2 (the artifact), narrowed by the user on 2026-10-17: one preset now, open to three later.

## Global Constraints

- Rule: alert when the last N consecutive readings all have HR > 120 and not moving, N >= 10. Same rule respond-agent verifies (hr > 120, still >= 10).
- Start call stays `start('stroke', { hr, movementMin, noReplySeconds: NO_REPLY_SECONDS })` with hr = current slider HR and movementMin = the run length at trigger (10).
- Sim clock starts at 01:30, one reading per sim minute, last 40 kept. Normal speed one reading per 1000 ms, Faster one per 250 ms.
- Comments at most one line. No setState inside effects (react-hooks lint). en and vi strings for every new key.
- Every test names the production edit that turns it red; record red output in `.superpowers/sdd/2026-10-17-sim-sliders/checks.md`, then revert.

## Review Focus

- Auto-start fires exactly once per armed watch, also when more ticks arrive before the incident shows up.
- After a finished incident, the rule is still met: nothing restarts until the user moves a slider, picks a preset or presses Reset.
- Page reload while an incident is open: no ticks, no auto-start, controls locked.
- Dragging not-moving to 10 with HR already high does not alert at once; the run counts up from the readings that are really high and still.
- Speech and David toggles still reach `useAutopilot` (now inside More options).

---

### Task 1: Watch domain and Simulator UI

**Files:**
- Modify: `web/src/domain/simulator.ts`, `web/src/features/individual/live/{SimulatorCard,LiveReadingsCard,LivePage}.tsx`, `web/src/locales/{en,vi}/live.json`
- Create: `web/src/features/individual/live/useWatch.ts`
- Test: `web/tests/domain/simulator.test.ts`, `web/tests/features/individual/simulator.test.tsx`, `web/tests/features/individual/autopilot.test.ts` (import rename only)

**Domain (`simulator.ts`):**
- `SimSettings` becomes `{ speech: SimSpeech; davidPicksUp: boolean }`; rename `NIGHT_ALERT` to `SIM_DEFAULTS = { speech: 'slurred', davidPicksUp: true }`. Remove `overridesFor`, `simSeries`, `ruleChecks`. Keep `scenarioFor`, `NO_REPLY_SECONDS`, `clipFor` (uses only `speech`).
- `export interface Watch { readings: Reading[]; clock: number; hr: number; stillMin: number }`; `clock` is minutes after midnight of the newest reading.
- `export const ALERT_MIN = 10`, `STILL_MAX = 15`, `HR_MIN = 45`, `HR_MAX = 180`.
- `export function blankWatch(): Watch`: 40 readings HR 64 + WOBBLE, all moving, clock 90 (01:30), hr 64, stillMin 0.
- `export type PresetId = 'night'`; `export const PRESETS: Record<PresetId, () => Watch>`. `night`: 34 moving readings 60 + WOBBLE, then readings 35..40 still with HR 124, 128, 132, 134, 138, 141 (oldest first), and readings 33..34 also still (last 8 still); hr 142, stillMin 8, clock 90.
- `export function tick(w: Watch): Watch`: append `{ minute: last.minute + 1, hr: w.hr + WOBBLE[...], moving: w.stillMin === 0 }`, keep last 40, clock + 1, stillMin = stillMin > 0 ? min(stillMin + 1, STILL_MAX) : 0.
- `export function setStill(w, n)`: stillMin = n; reading i (of 40) gets moving = i < 40 - n.
- `export const setHr = (w, hr) => ({ ...w, hr })` (history unchanged, new readings use it).
- `export function alertRun(readings): number`: trailing count with hr > 120 && !moving.
- `export type WatchNote = 'alert' | 'moving' | 'resting' | 'counting' | 'normal'`; `watchNote(w)`: run >= ALERT_MIN → alert; hr > 120 && stillMin === 0 → moving; stillMin > 0 && hr <= 120 → resting; run > 0 → counting; else normal.
- `export const clockText = (min: number) => HH:MM` zero padded, wraps at 24 h.

**Hook (`useWatch.ts`):** `useWatch({ locked, onAlert }: { locked: boolean; onAlert: (w: Watch) => void })` returns `{ watch, running, fast, armed, toggleRun, toggleFast, loadPreset(id), setHr(n), setStill(n), reset() }`.
- Returns `preset: PresetId | null` too (set by loadPreset, cleared by a slider drag or reset).
- State: watch (init `blankWatch()`), running (init true), fast (false), armed (true). Mirror watch, armed and running in refs and check/clear `armed.current` synchronously inside commit, so several beats in one act() cannot fire twice. Keep `onAlert` in a ref updated each render (the `useAutopilot` latest-ref pattern) so the interval never calls a stale closure.
- A failed start leaves the watch disarmed and paused; the operator presses the preset or Reset again (one-line comment).
- Interval runs only when `running && !locked`; period 1000 ms or 250 ms when fast. Each beat: `next = tick(w)`; commit.
- `commit(next)`: set watch; if `armed && !locked && alertRun(next.readings) >= ALERT_MIN` then armed = false, running = false, call `onAlert(next)`.
- `setHr` / `setStill`: if not armed (a run already fired) start from `blankWatch()` with the new slider value applied, set armed and running true; else apply to the current watch. Both go through commit.
- `loadPreset(id)`: watch = `PRESETS[id]()`, armed, running. `reset()`: blank, armed, running.

**SimulatorCard:** props `{ watch api from useWatch, settings, onChange, locked, onReset }` (no `start`; LivePage starts from `onAlert`). Layout per spec 4.1 c4, emoji kept as in the spec text:
- Head title `Simulator`, meta `Try Noa safely`.
- `ol.howto` four steps (spec text).
- Preset buttons from `Object.keys(PRESETS)`: `🌙 Night emergency`; `aria-pressed` on the loaded preset (track `preset: PresetId | null` in the hook; slider drag sets null).
- Slider `❤️ Heart rate` `<input type="range" min=45 max=180 aria-label="Heart rate">`, value label `{n} bpm`. Slider `🛋️ Not moving for` range 0–15, label `Moving` or `{n} min` plus ` ⚠️` at >= 10; ticks `0`, `5`, `10 min · alert` (red, bold), `15`.
- `<details>` summary `More options: who answers the phone` containing the existing Speech and David toggles.
- Buttons: `⏸️ Pause` when running, `▶️ Resume` when paused; `⏩ Faster` / `🐢 Normal speed`; `↺ Reset` (calls `onReset` and `watch.reset()`).
- All sliders, presets and run buttons disabled while `locked` or starting. Reset stays enabled.

**LiveReadingsCard:** props `{ watch }`. Head `📈 Live readings`, meta `One reading per minute from her watch and home sensors`, clock `clockText(watch.clock)` in mono on the right. LineChart y ticks [60, 100, 120, 160], HR line `#ef6a5e`, alert line at 120 dashed `#d9443f`. Movement strip green `#1fb39c` moving / `#c9d3d1` still, labels `−40 min · green = moving` and `now {HH:MM}`. Rule card: `Heart rate above 120 for 10 minutes while she is not moving`, line `{n} of 10 minutes · now {hr} bpm · {moving|not moving}` (n = min(run, 10)), a progress bar (`role="progressbar"` aria-valuenow n, max 10), and the note text for `watchNote` (spec 4.1 c8 strings).

**LivePage:** `const watch = useWatch({ locked: open, onAlert })`; `onAlert(w)` calls the existing `simStart('stroke', { hr: w.hr, movementMin: alertRun(w.readings), noReplySeconds: NO_REPLY_SECONDS })` with the same toast and error handling SimulatorCard has now (move it). `onReset` also calls `watch.reset()`. `sim` state uses `SIM_DEFAULTS`.

- [ ] **Step 1: Domain tests** in `tests/domain/simulator.test.ts` (replace the old ones, keep the clipFor test with `SIM_DEFAULTS`):
  - `tick` appends one reading, keeps 40, clock + 1, stillMin 8 → 9, a moving watch stays 0. Red: drop the stillMin increment.
  - `setStill(blank, 10)` marks exactly the last 10 still. Red: mark `i <= 40 - n`.
  - `alertRun` counts only the trailing high and still readings; the night preset starts at 6 and reaches 10 after 4 ticks. Red: count readings anywhere, not trailing.
  - `watchNote` returns each of the five notes for a crafted watch. Red: swap moving and resting.
  - `clockText(90) === '01:30'`, `clockText(1440 + 5) === '00:05'`. Red: drop the padding.
- [ ] **Step 2: UI tests** in `tests/features/individual/simulator.test.tsx` (replace the two "one case" tests; keep the 000 tests). Use `vi.useFakeTimers({ toFake: ['setTimeout','clearTimeout','setInterval','clearInterval'] })` in these tests only (as `live.test.tsx:14` does) with `vi.useRealTimers()` in afterEach; the 000 tests keep real timers.
  - Clicking `🌙 Night emergency` then advancing 4000 ms calls `start` once with `('stroke', { hr: 142, movementMin: 10, noReplySeconds: 45 })`; advancing 10 s more does not call it again. Red: do not clear `armed` in commit.
  - Sliders: set Heart rate to 140 and Not moving for to 10 with `fireEvent.change`; no start yet; after 10 beats of 1000 ms, start is called with hr 140. Red: make `setStill` mark readings high as well.
  - Faster: after clicking `⏩ Faster`, the night preset fires after 4 × 250 ms. Red: ignore `fast` in the period.
  - Locked: with an open incident, both sliders are disabled and advancing time never calls start. Red: drop `!locked` from the interval guard.
  - The Speech toggle is inside More options and still flips `aria-pressed`.
- [ ] **Step 3:** Implement domain, hook, cards, page, locales until green. Update the `autopilot.test.ts` import to `SIM_DEFAULTS`.
- [ ] **Step 4:** In `web/`: `npx tsc -b`, `npx eslint src tests`, `npx vitest run` all clean. Record red edits and outputs in checks.md.
- [ ] **Step 5:** Commit the named files: `feat(web): simulator sliders and live watch like the artifact`.
