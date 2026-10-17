# Real voice, instant slider trigger, simulator strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Presenter feedback on 2026-10-17 evening: (1) when she answers on Margaret's phone, the recorded clip must never play over her real voice; (2) dragging the sliders past the rule starts the demo at once, no 10-minute count; (3) match her latest artifact layout: Simulator as a full-width strip, then a "Margaret's circle" card beside Live readings.

**Architecture:** (1) LivePhoneCard reports any manual answer through a new `onManual` callback; LivePage turns the autopilot's voice answers off for that incident and the autopilot stops a clip that is playing without posting it. Default speech becomes `mic`. (2) Slider handlers in `simulator.ts` rewrite the trailing still readings to the slider HR when HR > 120, the same as the artifact's `stillSet` and `hrS` handlers, so `commit` sees a run of `stillMin` and fires. (3) SimulatorCard becomes span 12 with a four-column grid; a new `SimCircleCard` (span 4) shows the orbit in idle state; LiveReadingsCard stays span 8.

**Tech Stack:** React 19, TypeScript, i18next (en, vi), vitest.

**Spec:** presenter artifact https://claude.ai/artifact/TuxGMYnsU4RgeTf1Jdgsqe (latest version): `stillSet(n)`, the `hrS` input handler and the "layout: controls as a strip on top, then circle + readings" block with CSS `.simstrip .simgrid{grid-template-columns:1.25fr 1fr 1fr .8fr;gap:18px}`.

## Global Constraints

- Comments at most one line. No setState inside effects. en and vi strings for every new key.
- Every test names the red production edit; record red output in `.superpowers/sdd/2026-10-17-real-voice-strip/checks.md`, then revert with a backup copy (never `git checkout` a file with uncommitted work).
- The start call to core-api is unchanged: `start('stroke', { hr, movementMin, noReplySeconds: 45 })`, movementMin = run length at trigger (>= 10).

## Review Focus

- A clip that started playing just before she tapped record is stopped and never posted.
- Autopilot voice comes back on for the next Simulator run (new incident id or Reset).
- David auto-accept still follows the David toggle after a manual answer.
- HR slider at 121 still gives readings above 120 (no wobble dip below the line).
- Phone width (360 px): the strip columns stack, no horizontal scroll.

---

### Task 1: Real voice wins

**Files:** `web/src/features/individual/live/{useAutopilot.ts,LivePhoneCard.tsx,LivePage.tsx}`, `web/src/domain/simulator.ts` (SIM_DEFAULTS speech `mic`), tests `web/tests/features/individual/autopilot.test.ts` and the phone/live tests that cover LivePhoneCard.

- `LivePhoneCard` gets `onManual?: () => void`, called when she starts a recording, taps a yes/no or text reply, or presses Help on the phone (every path that calls `send` from a user gesture, plus `rec.start`). Not called by the noReply timer.
- `LivePage`: state `manual: string | null` holding the incident id she answered on. Autopilot option `voice: boolean` = `manual !== view?.id`. Reset and a new Simulator start clear `manual`.
- `useAutopilot`: new option `voice`. When `voice` is false no new clip is scheduled. Keep the playing clip in a ref; when `voice` turns false (or the effect cleans up for a new key), pause it and mark it posted so `post` never runs. David accept is unaffected.
- `SIM_DEFAULTS.speech = 'mic'`; Slurred (auto) stays in More options.

- [ ] Test: with `voice: false` from the start, advancing past GAP and FALLBACK plays nothing and posts nothing. Red: ignore `voice`.
- [ ] Test: clip playing, rerender with `voice: false`, then fire `ended`: `checkin` not called and `pause` called. Red: do not mark posted on cancel.
- [ ] Test: David still accepts with `voice: false` and davidPicksUp true. Red: gate the David effect on `voice`.
- [ ] Test (LivePhoneCard): pressing the record button calls `onManual` once. Red: drop the call in onRecord.
- [ ] Test: SimulatorCard default Speech toggle shows `I'll answer (mic)` pressed. Red: keep `slurred`.

### Task 2: Slider drag triggers at once

**Files:** `web/src/domain/simulator.ts`, `web/tests/domain/simulator.test.ts`, `web/tests/features/individual/simulator.test.tsx`.

- `setStill(w, n)`: as now, plus when `w.hr > 120` the last n readings get `hr = hiHr(w.hr, i)`.
- `setHr(w, hr)`: when `w.stillMin > 0 && hr > 120`, the last `stillMin` readings with hr <= 120 get `hiHr(hr, i)`; otherwise history unchanged.
- `hiHr(hr, i) = Math.max(121, hr + wobble(i))` so readings never dip to 120. `tick` uses the same clamp when `w.hr > 120 && w.stillMin > 0`.
- The UI test from the previous plan ("Sliders ... after 10 beats") changes: HR 140 then still 10 starts at once with `{ hr: 140, movementMin: 10, noReplySeconds: 45 }`, before any timer advance. Also still 10 then HR 140 starts at once.

- [ ] Test: `setStill(setHr(blank,140),10)` gives alertRun 10. Red: drop the HR rewrite in setStill.
- [ ] Test: `setHr(setStill(blank,10),140)` gives alertRun 10. Red: drop the rewrite in setHr.
- [ ] Test: `tick` of a still watch at hr 121 never produces a reading <= 120 over 8 ticks. Red: drop the clamp.
- [ ] UI tests above. Red: return early in `slide` without commit.

### Task 3: Strip layout and circle card

**Files:** `web/src/features/individual/live/{SimulatorCard.tsx,LivePage.tsx}`, new `web/src/features/individual/live/SimCircleCard.tsx`, `web/src/styles/globals.css` (strip grid), locales, a test.

- SimulatorCard: `GlassCard span={12}` with class `simstrip`; children in `.simgrid` with four `.simcol` columns: [how-to], [presets + Heart rate slider], [Not moving slider + ticks + More options], [Pause/Resume, Faster, Reset]. CSS: `.simstrip .simgrid{display:grid;grid-template-columns:1.25fr 1fr 1fr .8fr;gap:18px;align-items:start}` and `.simcol{display:grid;gap:8px;min-width:0;align-content:start}`; under 900 px one column.
- SimCircleCard (span 4): head `🫂 Margaret's circle` with pill `All normal`; the existing `Orbit` with the page's scene in its idle mode (look at how LiveAlertCard builds `orbitScene`/state and use the idle equivalent; render the empty `.c3d` box when scene is null); a stat row `0′` / `since alert` / `All normal`, right side `Watching quietly` / `Last known well —`. No Call 000 button (no backend action for it).
- LivePage simCards order: SimulatorCard, SimCircleCard, LiveReadingsCard (span 8). Shown only while no incident is open, as now.

- [ ] Test: idle page renders heading `Margaret's circle` and the strip columns contain the Heart rate slider and the Pause button. Red: do not render SimCircleCard.
- [ ] Run in web/: `npx tsc -b`, `npx eslint src tests`, `npx vitest run`; read totals from `web/.vitest/json/output.json` or a direct vitest run.
- [ ] Commit named files per task, messages `fix(web): real voice stops the autopilot clip`, `feat(web): slider drag past the rule starts the demo at once`, `feat(web): simulator strip and Margaret's circle card`.

## Fable plan review folded in

- Cancel order: keep `{ clip, cancel }` in a ref; cancel sets the same `posted` flag the `post` closure reads, then calls `clip.pause()`. Pausing rejects `play()` with AbortError, so `posted` must already be true. The cancel test stubs `play` to reject after `pause` and adds `pause` to the Audio stub.
- In-flight race: inside `post`, after the fetch/blob resolves, `if (!latest.current.voice) return` before `checkin`.
- `onManual` is called synchronously at the top of `onRecord` (before `rec.start()`) and in `onAnswer`. LivePhoneCard has no Help or text reply, so drop that path.
- Known and accepted: with still already at 10, dragging HR fires at the first value above 120 (hr 121). The how-to order (HR first) avoids it.
- SimCircleCard copies `home/CircleCard.tsx` (`<Orbit scene labels tilt={0.6} zoom={0.95}>`); no mode or state needed.
