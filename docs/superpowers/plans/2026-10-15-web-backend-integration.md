# Web ↔ Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the web screens to the backend data the BE already provides but the web does not use yet. Leave the screens that have no backend source on the mock.

**Architecture:** This plan changes no architecture. The web keeps reading Firestore through `data/sources/firebase.ts` and the overlays in `data/sources/overlay.ts`, and keeps writing through the four core-api routes in `data/api.ts`. Every change is gated on `VITE_DATA_SOURCE=firebase` (`repo.LIVE` / `useLiveIncident().live`), so mock mode and its tests stay unchanged.

**Tech Stack:** React 19, Vite, TypeScript, i18next (en/vi), Firebase JS SDK, Vitest + Testing Library.

**Spec:** `docs/contract.md` v1.4: §2.1 people, §2.2 hospitals, §4.1 public routes, §4.4 hospital-agent packet and its extension table.

## Audit summary (why this plan is small)

The backend exposes no read API. core-api's only GET is `/api/health`, and all screen data reaches the web through Firestore. The web already calls all four public core-api routes (`POST /api/demo/{scenario}`, `/api/demo/reset`, `/api/incidents/{id}/checkin`, `/api/incidents/{id}/actions`). It also already reads every Firestore collection in the contract: `people`, `hospitals`, `incidents`, `demo/current`, `forecasts`, `families`. respond-agent is a stub, and the web never calls hospital-agent directly.

**Already live or overlaid (no work):**

| Screen | Backend source |
|---|---|
| Home, Around-me orbit, context bar | `people/*`, `hospitals` |
| Forecast | `forecasts/margaret` |
| Lineage | `families/margaret` |
| Live / Emergency | `demo/current`, `incidents/{id}`, all four core-api routes, Storage audio |
| Hospital › ED (packet row and pathway) | `incidents/{id}.handoff.packet` |

**Has a backend source but is not wired (this plan):**

| # | Gap | Backend source |
|---|---|---|
| 1 | The packet ignores the §4.4 extension fields (`status`, `familyHistory`, `withheld`, `warnings`). A `BLOCKED_CONSENT` packet renders almost empty. | `incidents/{id}.handoff.packet` (merged from dev today) |
| 2 | Device › the Help button always plays the scripted demo, even in live mode | `POST /api/demo/stroke` |
| 3 | Record › "Preview the pre-arrival packet" always shows the fixture packet | `incidents/{id}.handoff.packet` |
| 4 | The Home "Resting heart rate" KPI baseline is hard-coded "base 63" | `people/margaret.baseline.restingHr` |

**No backend source; stays on the mock (a BE request, not FE work):**

| Screen | Missing on the BE |
|---|---|
| Health (24h HR, sleep, mood, steps, BP, devices) | No health or wearable data in Firestore |
| Around me (weather, air, alerts, news) | No environment feed |
| Record (encounters, meds, labs, sources, follow-up) | FHIR bundles exist only inside hospital-agent, with no read route. Hospital readiness has no `load` or ETA source; seed `hospitals` holds only name, location and strokeReady |
| Device feed, Me | No source |
| Privacy (consent matrix, audit) | Contract §6 says the web never writes. Consent lives in FHIR `Consent` inside hospital-agent, with no route |
| Hospital › Panel, Demand, Discharge; ED inbox (other rows) | No source |
| Community, Watch | No source |
| Forecast what-if sim / BP projection | Client-side model (`domain/riskSim.ts`); no BE scoring route |

## Global Constraints

- The web never writes Firestore (contract §2, line 56). Writes go only through `data/api.ts`.
- Mock mode (`VITE_DATA_SOURCE` unset or `mock`) must render exactly as today. Existing tests must pass unchanged.
- Every new user-visible string goes in both `locales/en/*.json` and `locales/vi/*.json`.
- Absent `allergies` means unknown, never "no allergies". `[]` means a recorded "no known allergy" (contract §4.4, field presence).
- `status` is how the packet was prepared, never delivery status (contract §4.4 table).
- Commit once at the end, not per task.
- The floor is `npm run typecheck && npm run build && npm test` in `web/`.

## Review Focus

- A packet with `status: BLOCKED_CONSENT` and no `patient`: the ED and Record drawer must show the always-present facts plus a clear "withheld by consent" row, never an empty pane. Test in Task 1.
- A packet with `allergies` absent and the warning `ALLERGIES_NOT_RECORDED`: show "Not recorded", never "None known". Test in Task 1.
- Help is pressed in live mode while a demo is already running (core-api 409 `INVALID_STATE`): open the running incident on Live, never a dead end or a scripted run. Test in Task 2.
- Help is pressed in live mode and core-api fails (network or 5xx): show a toast, stay on Device, and do not start the scripted demo. Test in Task 2.
- Record's packet preview in live mode with no incident, or with `handoff.status` other than `RECEIVED`: fall back to the fixture packet. Test in Task 3.

---

### Task 1: Packet §4.4 extension fields

**Files:**
- Modify: `web/src/data/contract.ts:102-116` (`PacketDoc`)
- Modify: `web/src/domain/incident.ts:275-291` (`packetRows`)
- Modify: `web/src/locales/en/live.json`, `web/src/locales/vi/live.json` (the `incident.packet` block)
- Test: `web/tests/domain/incident.test.ts`

**Interfaces:**
- Produces: `PacketDoc` with `patient`, `conditions`, `medications`, `allergies`, `communication` made optional. It adds `status: 'COMPLETED' | 'PARTIAL' | 'BLOCKED_CONSENT'`, `familyHistory?: string[]`, `withheld?: PacketCategory[]` and `warnings?: string[]`, plus `sources?: string[]` (typed only, not displayed). `export type PacketCategory = 'identity' | 'conditions' | 'medications' | 'allergies' | 'familyHistory' | 'communication'`. `packetRows(p: Partial<PacketDoc>, tz: string): LabelValue[]` keeps its signature.

- [ ] **Step 1: Write failing tests** in `tests/domain/incident.test.ts`:

```ts
test('packet rows: family history follows history', () => {
  const rows = packetRows({ ...incident.handoff!.packet!, familyHistory: ['father: stroke at 68, hypertension'] }, 'UTC')
  const labels = rows.map((r) => r[0])
  expect(labels.indexOf('Family history')).toBe(labels.indexOf('History') + 1)
  expect(rows).toContainEqual(['Family history', 'father: stroke at 68, hypertension'])
})

test('packet rows: blocked by consent shows the emergency facts and what was withheld', () => {
  const rows = packetRows({ suspected: 'STROKE', findings: ['HR 142'], text: 'PRE-ARRIVAL', status: 'BLOCKED_CONSENT',
    withheld: ['identity', 'medications'] }, 'UTC')
  expect(rows.find((r) => r[0] === 'Patient')).toBeUndefined()
  expect(rows).toContainEqual(['Findings', 'HR 142'])
  expect(rows).toContainEqual(['Withheld', 'No valid consent · Identity, Medicines'])
})

test('packet rows: partial packet lists withheld categories without the consent note', () => {
  const rows = packetRows({ ...incident.handoff!.packet!, status: 'PARTIAL', withheld: ['allergies'] }, 'UTC')
  expect(rows).toContainEqual(['Withheld', 'Allergies'])
})

test('packet rows: absent allergies with ALLERGIES_NOT_RECORDED read as not recorded, never none known', () => {
  const { allergies: _, ...p } = incident.handoff!.packet!
  const rows = packetRows({ ...p, warnings: ['ALLERGIES_NOT_RECORDED'] }, 'UTC')
  expect(rows).toContainEqual(['Allergy', 'Not recorded'])
})

test('packet rows: Vietnamese labels for the new rows', async () => {
  await i18n.changeLanguage('vi')
  const rows = packetRows({ suspected: 'STROKE', findings: [], text: 'x', status: 'BLOCKED_CONSENT', withheld: ['identity'] }, 'UTC')
  expect(rows).toContainEqual(['Bị giữ lại', 'Không có đồng ý hợp lệ · Danh tính'])
  await i18n.changeLanguage('en')
})
```

- [ ] **Step 2: Run them and check they fail.** Run `cd web && npx vitest run tests/domain/incident.test.ts`. Expect the 5 new tests to FAIL (missing rows), and expect type errors on `status`, `withheld` and `warnings`.

- [ ] **Step 3: Update `PacketDoc`** with the fields and the `PacketCategory` type listed in Interfaces.

- [ ] **Step 4: Extend `packetRows`.**
  - Insert `familyHistory` right after the History row, as `[k('familyHistory'), list.join(' · ')]`.
  - Allergy row: if the field is absent and `warnings` includes `ALLERGIES_NOT_RECORDED`, show `k('notRecorded')`. The existing `[]` → `noneKnown` branch stays.
  - Last, before the `text` fallback: when `withheld?.length`, add `[k('withheld'), …]`. The value is `withheld.map((c) => k('cat.' + c)).join(', ')`, prefixed with `k('noConsent') + ' · '` when `status === 'BLOCKED_CONSENT'`.
  - The `text` fallback still applies only when there are no rows.

- [ ] **Step 5: Add the locale keys** under `incident.packet` in both languages.

| Key | en | vi |
|---|---|---|
| `familyHistory` | Family history | Tiền sử gia đình |
| `withheld` | Withheld | Bị giữ lại |
| `noConsent` | No valid consent | Không có đồng ý hợp lệ |
| `notRecorded` | Not recorded | Chưa ghi nhận |
| `cat.identity` | Identity | Danh tính |
| `cat.conditions` | History | Bệnh sử |
| `cat.medications` | Medicines | Thuốc |
| `cat.allergies` | Allergies | Dị ứng |
| `cat.familyHistory` | Family history | Tiền sử gia đình |
| `cat.communication` | Comms | Giao tiếp |

- [ ] **Step 6: Run the tests and check they pass.** Run `cd web && npx vitest run tests/domain/incident.test.ts && npm run typecheck`. Expect all tests to PASS and no type errors. Any compile error where code reads `p.patient` without a guard must be fixed with `?.`. `liveView` at `incident.ts:315-346` reads `p.patient` for `incoming.patient`.

### Task 2: Device › Help starts the real incident in live mode

**Files:**
- Modify: `web/src/features/individual/device/DevicePage.tsx:46-55`
- Modify: `web/src/locales/en/device.json`, `web/src/locales/vi/device.json` only if a new toast key is needed. Prefer reusing `live:live.failed`.
- Test: `web/tests/features/individual/device.test.tsx`

**Interfaces:**
- Consumes: `useLiveIncident(): { live, start(scenario: DemoScenario): Promise<void> }` from `@/state/LiveIncident`, and `apiErrorCode(e: unknown): string | null` from `@/data/repo`, as `LiveIdleCard.tsx:22` uses it.

- [ ] **Step 1: Write failing tests** in a new file, `tests/features/individual/deviceLive.test.tsx`. A separate file is needed because `vi.mock` is per file. Mock `@/state/LiveIncident` so that `useLiveIncident` returns `{ live: true, start, ...INERT-like rest }`, where `start = vi.fn()`.
  - `help in live mode starts the stroke demo and opens Live`: `start` resolves. After clicking Help, `start` was called with `'stroke'`, `push` was called with `'/individual/live'`, and `app().emergency` is still at its initial (not started) state.
  - `help in live mode while a demo runs opens Live`: `start` rejects with `new ApiError(409, 'INVALID_STATE', 'busy')`. Expect `push('/individual/live')`, and no failure toast.
  - `help in live mode on a server failure stays on Device`: `start` rejects with `new ApiError(0, 'NETWORK', 'offline')`. Expect `push` not called, the toast text to equal `t('live:live.failed')` in English, and the emergency not started.

- [ ] **Step 2: Run them and check they fail.** Run `cd web && npx vitest run tests/features/individual/deviceLive.test.tsx`. Expect FAIL, because `start` is not called.

- [ ] **Step 3: Branch the Help handler** on `live`. Keep `setWho('family')` in both branches.
  - When live: `start('stroke')`. On success or `INVALID_STATE`, call `router.push('/individual/live')`. Otherwise, toast `live:live.failed`.
  - When not live: run the existing scripted path unchanged.
  - Disable the button while the request is in flight, as `LiveIdleCard` does with `busy`.

- [ ] **Step 4: Run all device tests and check they pass.** Run `cd web && npx vitest run tests/features/individual/device`. Expect all to PASS; the existing mock-mode Help test stays green.

### Task 3: Record › packet preview shows the live packet

**Files:**
- Modify: `web/src/features/individual/record/HospitalsCard.tsx:33-38`
- Test: `web/tests/features/individual/record.test.tsx`, plus a new `recordLive.test.tsx` for the mocked live context

**Interfaces:**
- Consumes: `useLiveIncident().view: LiveView | null`. `view.packet.rows: LabelValue[]` is non-null only when `handoff.status === 'RECEIVED'` (`domain/incident.ts:315`). This includes Task 1's new rows.
- Consumes: `PacketBody({ rows }: { rows: LabelValue[] })` (`HospitalsCard.tsx:18`), the same type as `view.packet.rows`.

- [ ] **Step 1: Write failing tests** in `recordLive.test.tsx`, mocking `@/state/LiveIncident`.
  - `preview shows the live packet when one was received`: `view.packet.rows = [['Patient', 'Margaret Collins, 78 · Female'], ['Family history', 'father: stroke at 68']]`. After clicking "Preview the pre-arrival packet", the drawer contains `father: stroke at 68`.
  - `preview falls back to the fixture packet without a received packet`: `view = null`. The drawer shows a row from the `hospital.json` packet, the same assertion the existing record test makes.

- [ ] **Step 2: Run them and check they fail.** Run `cd web && npx vitest run tests/features/individual/recordLive.test.tsx`. Expect the first test to FAIL.

- [ ] **Step 3: Update the preview.** In `preview`: if `live && view?.packet`, open the drawer with `view.packet.rows` synchronously. Otherwise, keep the current `getHospital()` path.

- [ ] **Step 4: Run the record tests and check they pass.** Run `cd web && npx vitest run tests/features/individual/record`. Expect all to PASS.

### Task 4: Resting-heart-rate baseline from `people.baseline`

**Files:**
- Modify: `web/src/data/sources/overlay.ts:64-84` (`overlayPerson`)
- Modify: `web/src/locales/en/overlay.json`, `web/src/locales/vi/overlay.json`
- Test: `web/tests/data/overlay.test.ts`

**Interfaces:**
- Consumes: `PersonDoc.baseline?: { restingHr: number; nightHr: number }` (`contract.ts:32`).
- Produces: `overlayPerson(p: Person, doc: PersonDoc): Person`, with the same signature. `kpisTechnical` gets the entry whose label equals `overlay:person.restingHrLabel` and its `baseline` replaced.

- [ ] **Step 1: Write failing tests** in both the `in English` and `in Vietnamese` describe blocks of `overlay.test.ts`:
  - `resting HR baseline comes from the person doc`: with `doc.baseline = { restingHr: 60, nightHr: 55 }`, the KPI labelled "Resting heart rate" (vi: the label used in `locales/vi/data/margaret.json`) has `baseline === 'base 60'` (vi: the matching format).
  - `no baseline keeps the mock`: when `doc.baseline` is absent, `kpisTechnical` is deep-equal to the mock's.

- [ ] **Step 2: Run them and check they fail.** Run `cd web && npx vitest run tests/data/overlay.test.ts`. Expect FAIL.

- [ ] **Step 3: Implement.**
  - Add the keys `person.restingHrLabel` and `person.restingHrBase` to `overlay.json`.
    - en: `"Resting heart rate"` and `"base {{n}}"`.
    - vi: copy the label exactly from `locales/vi/data/margaret.json` `kpisTechnical[0].label`, and use the vi fixture's baseline format.
  - In `overlayPerson`, map `kpisTechnical` the same way profile rows are matched by label today.

- [ ] **Step 4: Run them and check they pass.** Run `cd web && npx vitest run tests/data/overlay.test.ts`. Expect PASS.

### Task 5: Verify and commit

- [ ] **Step 1: Full floor.** Run `cd web && npm run lint && npm run typecheck && npm test && npm run build`. Expect everything to pass.
- [ ] **Step 2: Manual live check (optional; needs `VITE_FIREBASE_*` and a reachable core-api).** Run `cd web && npm run dev`, then:
  - Open Device and press Help. Expect to land on Live with a new incident.
  - Once the handoff is RECEIVED, open Record and check that "Preview the pre-arrival packet" shows the live rows.
  - Respond-agent is still a stub, so its `{text:"stub"}` packet will render only the Packet fallback row. That is expected until the BE forwards to hospital-agent.
- [ ] **Step 3: Commit once.**

```bash
git add web/src web/tests
git commit -m "feat(web): wire packet extensions, live Help and live packet preview to the backend"
```

## Open questions for the BE team (not blocking this plan)

1. respond-agent `/handoff` is still a stub that never calls hospital-agent, so live packets are `{text:"stub"}` until that lands.
2. core-api has no CORS. `VITE_API_BASE` pointing at run.app will fail. Same-origin `/api` through Hosting works.
3. Nothing in this repo writes `forecasts` or `families`. The overlays fall back to the mock until Minh's job runs.
4. A read route for Record (FHIR encounters, meds, labs) and for consent would move Record and Privacy off the mock.
