# Handover per script section 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Nana's feedback: the hand-off from Noa to the hospital pre-arrival is unclear. Follow script section 6 ("Red: hospital, ambulance and handover"): after the 000 call, Noa sends the advance notice to Camperdown Stroke Centre, the stroke team replies, then Noa tells James, Sarah and David that the ambulance is coming.

**Architecture:** core-api starts the hand-off from a Cloud Tasks timer scheduled when the automatic 000 call is logged, not at escalation start, so it lands after the 000 dialogue. Handoff logs the script's spoken lines and a new `FAMILY_UPDATE` timeline event. The web Live conversations card shows HANDOFF_SENT from the event text and renders FAMILY_UPDATE to each family member (the user approved this small edit in Hai's card).

**Tech Stack:** Spring Boot 3, Java 17, JUnit (core-api `mvn -q test`); React + vitest (web).

**Spec:** Claude Doc "No One Alone, Noa Conversation Script" (8xmbVzH5Bnmq3r9GXT9rAQ), section 6.

## Global Constraints

- Script wording, exact:
  - Noa to the stroke centre: `This is Noa from No One Alone. {Name}, {age}, {sex}. Suspected stroke. Last seen well {HH:MM}. Slurred speech found {HH:MM}. Heart rate up to {hr}. {meds clause}. Allergy: {allergies}. ETA {n} min. Next of kin: {name} ({relation}).` Times are local (`person.timezone`), HH:MM. Drop a clause whose data is missing; never print `null`.
  - Stroke team: `Received. Stroke call activated, CT scanner on standby.`
  - Family update: `An ambulance is on its way to {first name} (about 12 minutes). The stroke team at {hospital} has her details. {David line}` where the David line is `{David first name} is on his way.` if a NEARBY member accepted, else `I'm staying with her.`
- Delay: `HANDOFF_DELAY_SECONDS = 25` after the automatic 000 call (the 000 dialogue is 8 short lines). When Cloud Tasks is disabled (tests, local), start the hand-off at once.
- Hand-off stays idempotent (`x.handoff != null` guard). A duplicate task is fine.
- Comments one line. No AI attribution. Every test names its red production edit; record red output in `.superpowers/sdd/2026-10-17-handover-script/checks.md`.

## Review Focus

- David accepts: the 000 call is logged in `Actions.accept`; the hand-off must still be scheduled.
- Nobody nearby: `EscalationRules.noNearby` runs inside mutations from Escalation and from Actions.timeout/decline; each path schedules the hand-off once after its mutation.
- Ba Mai (Hue, 115, vi locale) still works: the line stays English for now, no crash on missing meds or allergies.
- Reset or a closed incident before the timer fires: the task finds the incident gone or closed and does nothing.
- The hospital page still gets the packet (`handoff.packet`) as before.

---

### Task 1: core-api hand-off after the 000 call, script lines, family update

**Files:** `core-api/src/main/java/com/noonealone/coreapi/flow/{Handoff,Escalation,Actions,EscalationRules}.java`, `web/InternalController.java` only if routing needs it, tests `core-api/src/test/java/com/noonealone/coreapi/flow/HandoffTest.java`, `StrokeFlowTest.java`.

- Remove `handoff.start` from `Escalation` (line ~153).
- One helper, e.g. `Handoff.afterCall(Incident inc)`: if the incident has a SYSTEM `CALLED_115` and `handoff == null`, schedule `tasks.schedule(id, "handoff", 1, HANDOFF_DELAY_SECONDS)`; when Cloud Tasks is disabled call `start(id)` directly. Call it after every mutation that can log the automatic 000 call: Escalation (noNearby at start), Actions.accept, Actions.timeout, Actions.decline. Read the code for any other `noNearby`/`autoCall` caller.
- `Actions.timeout(incidentId, memberId, attempt)`: when `memberId` is `"handoff"`, call `handoff.start(incidentId)` and return (skip the member-timeout logic). Guard: incident exists and is not CLOSED. Watch for a constructor cycle between Actions and Handoff; break it the simplest way (Handoff does not need Actions).
- `Handoff.start`: first mutate logs `HANDOFF_SENT` by actor `AGENT` with the Noa line above (built from Person, incident alert hr, lastKnownWellAt, the time slurred speech was found = the TRIAGED event time or the incident's triage time, chosen hospital, etaMin, first DISTANT circle member as next of kin). Second mutate logs `HANDOFF_RECEIVED` by actor `hospital` (or keep SYSTEM if the web relies on it; check `web/src/domain/agent.ts` and `incident.ts`) with the stroke team line, then `FAMILY_UPDATE` by `AGENT` with the family line. FAILED path unchanged.
- Tests (red edit in brackets):
  - Escalation with nobody nearby and tasks disabled: timeline order is `CALLED_115` before `HANDOFF_SENT` before `HANDOFF_RECEIVED` before `FAMILY_UPDATE`. [call `handoff.start` back in Escalation before noNearby]
  - David accepts: `HANDOFF_SENT` exists after `CALLED_115`, and `FAMILY_UPDATE` text contains `David is on his way.` [drop the afterCall call in accept]
  - Nobody accepts: `FAMILY_UPDATE` ends `I'm staying with her.` [always use the David line]
  - `HANDOFF_SENT` text equals the exact Margaret line for the seed (Margaret Collins, 78, female, times 01:30/01:40 in the test clock, hr 137 or the incident hr, meds and allergy from the seed). [drop the allergy clause]
  - Timeout task with memberId `handoff` on a CLOSED incident does nothing. [remove the CLOSED guard]
- Run `mvn -q test` in core-api (long; this is fine).

### Task 2: web shows the spoken lines and the family update

**Files:** `web/src/data/contract.ts` (TimelineKind adds `FAMILY_UPDATE`), `web/src/features/individual/live/ConversationsCard.tsx`, `web/src/locales/{en,vi}/live.json` only if a label is needed, test `web/tests/features/individual/` (new or existing conversations test).

- HANDOFF_SENT: use `e.text` (the spoken line), not `inc.handoff.packet.text`.
- FAMILY_UPDATE: one Noa line per family member channel that exists in `people.members` among the circle (James, Sarah, David), text `quote(e.text)`, so the filter chip per person shows it. If that is more than a few lines, push it once on James's channel (first DISTANT member).
- Check `web/src/domain/agent.ts` step list and `incident.ts` PHASE/helperStatus still behave with the new kind (unknown kinds must not crash).
- Test: an incident with HANDOFF_SENT text `This is Noa...` and a packet with text `PRE-ARRIVAL...` renders the Noa line, not the packet; a FAMILY_UPDATE renders under James. [use packet.text again]
- Run in web/: `npx tsc -b`, eslint, `npx vitest run`.

- [ ] Commit per task: `feat(core-api): hand off to the stroke centre after the 000 call, with the script lines`, `feat(web): show the hand-off notice and the family update in Live conversations`.

## Fable plan review folded in (overrides the text above)

- `afterCall` also requires `inc.level == Level.EMERGENCY` (noNearby logs CALLED_115 for every level).
- Test values for Margaret come from the test clock, not the script: Last seen well 05:55, slurred speech 06:03 (Australia/Sydney), hr 142 (`IncidentFlowAlertTest.stroke()`, `FixedClockConfig.NOW`). Read the fixture and assert the exact string it gives.
- Add `public boolean enabled()` to `EscalationTimers`; flow tests mock it (false), so `start` runs inline. Update `HandoffTest` assertions on the old HANDOFF texts.
- Web: adding `FAMILY_UPDATE` to `TimelineKind` needs entries in `PHASE` (`incident.ts`, use `handOff`) and `ICON` (`NoaLogCard.tsx`).
- `StrokeFlowTest` does not exist: put the accept / nobody-nearby / CLOSED tests in `EscalationTest` and `ActionsTest`.
- Keep `HANDOFF_RECEIVED` actor `SYSTEM`.
- Also `deleteQuietly(taskName(id, "handoff", 1))` in `Actions.close` and `DemoService.reset`.
- Slurred time: first `checkIn.turns` entry with assessment clarity SLURRED; fallback the TRIAGED event time.
- Time format: `ZoneId.of(person.timezone)` with the existing default zone fallback, `HH:mm`. Missing meds or allergies: drop the clause.
