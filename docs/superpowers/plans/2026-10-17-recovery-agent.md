# Recovery Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the hospital sends Margaret home, the recovery agent shows its delivery steps on the hospital side and books Day 1/3/7/14/30 follow-up calls. Margaret gets a "My recovery" tab and her family gets a "Recovery" tab. Both show today's tasks, why each one matters, a tick for each, and her follow-up calls.

**Architecture:** No new endpoint. `POST /api/incidents/{id}/recovery` still runs as it does on dev: respond-agent writes the summary with Gemini, voices each reminder with Chirp, and core-api writes `incident.recovery` to Firestore. There is no backend change. A fixed `WHY` map on the web gives the reason for each DEFAULT_PLAN item. The web builds the delivery steps, today's tasks and the call schedule from the stored recovery doc using pure functions in `web/src/domain/recovery.ts`. The current RecoveryCard moves from the Me page to a new `individual/recovery` route.

**Tech Stack:** Spring Boot 3.3 (core-api, Testcontainers Firestore), React + Vite + i18next + vitest (web). respond-agent code does not change.

**Spec:** Nana's prototype (https://claude.ai/artifact/2BX1DcwoUiWjFgeaK6mVyy: hospital "Patient record & discharge" tab, "My recovery" / "Recovery" tabs, 30-day follow-up board). Approved by Dũng 17/10: "Xong rồi làm recovery".

**What is real and what is display only**
- Real: the Gemini summary (or the doctor's notes when `fallback`), Chirp audio on the summary and each reminder, the reminders sorted by time, follow-up appointment dates, `status: CLOSED`, the `DISCHARGED` timeline entry, and family seeing the same Firestore doc. Each delivery step is worked out from these stored fields.
- Display only: the `why` text (fixed map for the demo plan), the Day 1/3/7/14/30 call schedule (dates come from `createdAt`; no calls are placed), the 550 ms step-by-step reveal, the Margaret row on the 30-day board, and the ticks (kept in the tab only, not saved).

**Cut from Nana's prototype**
- The separate "Patient record & discharge" hospital tab. The builder stays in ED as `RecoveryCard`.
- The "Checking the plan: no interactions" step. It would claim a drug-interaction check that nothing performs.
- The "Updating her pill box and pharmacy" step. There is no integration behind it.
- The New / Increased / Stop status per medicine, and the apixaban/perindopril plan. We keep the current DEFAULT_PLAN medicines.
- The "Day N of 30" bar, "Jump to the next day", the "Show the reminder now" drawer with snooze, the "Add to calendar" buttons, the Call 000 card, and the 14% readmission risk.
- Ticks reaching the family, and medicines grouped into one row per time slot.

## Global Constraints

- Code, comments and commits in English. Comments at most one line. No AI attribution.
- Every test step names the production edit that turns it red. Record the red output in `.superpowers/sdd/2026-10-17-recovery/checks.md`.
- en and vi strings for every new label.
- Mobile: no horizontal scroll at 360 px. Tick buttons are real `<button>`s with labels.
- No new dependencies and no new endpoints.
- The Simulator branch (feat/simulator) edits `web/src/locales/{en,vi}/live.json`, `LivePage.tsx`, `domain/incident.ts`; this plan must not touch those files.

## Review Focus

1. A delivery step must never claim something the data does not show. With `fallback: true` the summary step says the doctor's notes were used. Reminders without `audioPath` are not counted as "with voice".
2. The step reveal must start only after the snapshot has `recovery`, and must not restart on re-render (StrictMode).
3. Reminders whose text matches no WHY key still render (no why line).
4. The family must not see the `recovery` route redirect to their first page (`resolvePage` must accept it for both `who` values).
5. Moving RecoveryCard off MePage must leave the existing Me tests green.

---

### Task 1: dropped after Fable review (why is web-only)

### Task 2: web recovery domain

**Files:**
- Modify: `web/src/domain/recovery.ts`
- Test: `web/tests/domain/recovery.test.ts`

**Interfaces (produces):**
```ts
export const WHY: Record<string, string>  // keyed by lowercased med name or activity text from DEFAULT_PLAN
export interface Task { id: string; time: string; kind: 'MED' | 'ACTIVITY'; title: string; why?: string; audioPath?: string }
export function todayTasks(r: RecoveryDoc): Task[]   // built from r.reminders (already one row per item+time, sorted, with kind/audioPath); `why` attached by looking up WHY with the med name / activity text found in the reminder text; a miss only loses the why. id = the existing reminder key so nextReminder and the done set keep working
export const CALL_DAYS = [1, 3, 7, 14, 30] as const
export function followUpCalls(createdAt: string, tz: string): { day: number; date: string }[]   // local date of createdAt + day
export type Step = { key: string; vars: Record<string, string | number> }  // i18n key under hospital:ed.recovery.steps
export function deliverySteps(r: RecoveryDoc, circle: string[]): Step[]
// summary | summaryFallback; reminders {n, voiced}; calls {days: '1, 3, 7, 14, 30'}; appointments {list} (only when followUps); circle {names} (only when circle non-empty); delivered
// en wording: "Summary written in plain words" / "Doctor's notes used as the summary"; "{n} reminders set, {voiced} with a spoken reminder"; "Check-in call dates added to her plan: Day {days}"; "Appointments: {list}"; "Visible to {names}"; "Plan is on Margaret's screen"
```

- [ ] Tests: `todayTasks` follows reminder order and attaches `why` for a known item and none for an unknown one; `followUpCalls('2026-10-16T22:00:00Z','Australia/Sydney')` gives Day 1 = 2026-10-18; `deliverySteps` uses `summaryFallback` when `fallback`, `voiced` counts only reminders with `audioPath`, and the circle step is absent for an empty circle. Red edit per test: break the matching branch.

### Task 3: hospital delivery steps and board row [after Task 2; parallel with Task 4]

**Files:**
- Modify: `web/src/features/hospital/ed/RecoveryCard.tsx`
  - DEFAULT_PLAN: activities become a walk (10:00, 16:00), "Check your blood pressure" (08:15, 18:15), speech exercises (14:00) and "Drink a glass of water" (11:00, 16:00), with `why` texts in the WHY map of `domain/recovery.ts` (no per-row why input).
  - Sent state: while busy the button reads "Agent is delivering…". Once `incident.recovery` exists after a send from this mount, reveal `deliverySteps(recovery, first names of people.members)` with one `setTimeout` per step (550 ms) keyed on the shown count (`useEffect(..., [recovery, shown])`, cleanup clears it); if `recovery` already exists at mount, render all steps at once. Then show the reminders list as it does today.
- Modify: `web/src/features/hospital/discharge/DischargePage.tsx`: it passes `h.discharge.board` to `BoardCard`; when `useLiveIncident().incident?.recovery` exists, prepend to that array a `DischargeRow` (type in `@/data/types`, tz = `people.person?.timezone ?? 'Australia/Sydney'`) (`Margaret C., 78`, discharged date from `createdAt`, diagnosis, `days: ['up','up','up','up','up']`, risk "New", tone plain).
- Modify: `web/src/locales/{en,vi}/hospital.json` (`ed.recovery.steps.*`, `ed.recovery.why`, `ed.recovery.delivering`)
- Test: `web/tests/features/hospital/recovery.test.tsx`, `web/tests/features/hospital/hospital.test.tsx`

- [ ] Test: with a recovery that has `fallback: false` and 2 voiced reminders, the steps appear in order (fake timers) and include "Check-in call dates added to her plan: Day 1, 3, 7, 14, 30". Red edit: render the steps without `deliverySteps`.
- [ ] Test: the discharge board shows the Margaret row only when the live incident has `recovery`. Red edit: always or never prepend it. Mock `useLiveIncident` as `tests/features/hospital/recovery.test.tsx` does.

### Task 4: "My recovery" and "Recovery" tabs [after Task 2; parallel with Task 3]

**Files:**
- Modify: `web/src/domain/views.ts`: add `recovery` to `TABS_SELF` after `me`, to `TABS_FAM` after `live`, and to `PAGE_IDS`
- Modify: `web/src/features/registry.tsx` (`'individual/recovery': RecoveryPage`), `web/src/locales/{en,vi}/common.json` (`tabs.self.recovery` "My recovery", `tabs.family.recovery` "Recovery", and `pageTitles.recovery`)
- Create: `web/src/features/individual/recovery/RecoveryPage.tsx`
  - With no live recovery: an idle card ("Your / Margaret's recovery plan will appear here").
  - Otherwise: the moved `RecoveryCard` plus a follow-up calls card. The card lists `followUpCalls` with topic text (Day 1 "How are you feeling, any headaches?", Day 3 "Are the new medicines going OK?", Day 7 "GP visit and blood pressure review", Day 14 "Walking and falls check", Day 30 "How is the month going?") and a "Planned" pill. Wording uses `who` (your / her).
- Move and modify: `web/src/features/individual/me/RecoveryCard.tsx` to `.../recovery/RecoveryCard.tsx`. The today list uses `todayTasks`: time, title, `why` in small text, Play when there is `audioPath`, and a Done / Taken button that ticks locally. The summary, next reminder, appointments and notes stay as they are.
- Modify: `web/src/features/individual/me/MePage.tsx` (remove the RecoveryCard render), `web/src/locales/{en,vi}/me.json`
- Test: move `web/tests/features/individual/recoveryCard.test.tsx` and extend it; add a views test in `web/tests/domain/views.test.ts`

- [ ] Test: `resolvePage('individual','recovery','family')` and the same for `'self'` return ok. Red edit: add the tab to one list only.
- [ ] Test: a task shows its `why` and ticking it marks it done. Red edit: drop `why` in the render.
- [ ] Test: the calls card lists 5 rows with dates. Red edit: slice `CALL_DAYS`.
- [ ] `registry.test.ts` and the Me tests stay green.

### Task 5: Verify on prod and runsheet [after 1-4]

- [ ] Ship as one PR to dev, merge when CI is green, and wait for the deploy.
- [ ] In the browser pane: run Night emergency through to handoff, then on Hospital ED press "Send home with this plan". Steps reveal with the real counts. The Discharge board shows Margaret's row. Switch to self: "My recovery" shows the tasks with why, Play works, ticks work, and 5 calls appear. Switch to family: "Recovery" shows the same plan. Check at 360 px.
- [ ] Add the recovery scene to the private runsheet.
