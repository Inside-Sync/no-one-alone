# No One Alone: data contract

Version 1.4, 15/10. Owner: Dũng. Reviewers: Tài, Minh, Hải.

This file is the only source of truth for data shapes and service interfaces. A change goes through a PR that all four reviewers see. Do not change a shape in code first.

## 1. Conventions

- Timestamps are ISO-8601 UTC strings with `Z`, for example `2026-10-15T19:03:00Z`. Screens convert to the viewer's `timezone`.
- IDs are kebab-case strings. Seed entities use fixed IDs (`ba-mai`, `ong-hung`, `margaret`, `david`). Incident IDs equal the alert ID. A person's FHIR Patient ID equals their `personId`.
- Enums are UPPER_SNAKE strings. An unknown enum value is a bug, not a fallback.
- Absent optional fields are omitted, never `null`, except `ownerId`, which is `null` until someone accepts.
- All people, places and records are fictional.

### Hosting and URLs

- The web app is served by Firebase Hosting at `https://noonealone.insidesync.ai`. DNS is on Cloudflare as DNS only (grey cloud), so Firebase can issue the certificate.
- The web calls core-api on the same origin under `/api/**`. Firebase Hosting rewrites that path to the `core-api` Cloud Run service, so there is no CORS and no Cloud Run URL in the web code.
- core-api serves its public routes with the `/api` prefix (Hosting forwards the path unchanged). Its internal routes (`/alerts`, `/tasks/*`) stay at the root and are called on the `run.app` URL only.
- Hosting rewrites time out after 60 s. Every public route answers fast (`202` or `200`) and does slow work after responding.

```json
{
  "hosting": {
    "public": "web/dist",
    "rewrites": [
      { "source": "/api/**", "run": { "serviceId": "core-api", "region": "asia-southeast1" } },
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

If the Hosting rewrite to Cloud Run does not work in `asia-southeast1` at the first deploy, the web calls the `run.app` URL directly and core-api allows CORS from `https://noonealone.insidesync.ai` and `http://localhost:5173` only.

### Story clock

Each scenario has a local story time. `storyStart` is that time in the older person's `timezone` (Bà Mai: `Asia/Ho_Chi_Minh`, Margaret: `Australia/Sydney`). A person without `timezone` uses `Asia/Ho_Chi_Minh`. The video shows the stroke at 02:03 local time on 16/10, but the demo is recorded later. When a demo scenario starts, core-api stores `demo.clockOffsetMs = storyStart - realNow`. The value is negative whenever recording happens after the story date.

- core-api writes every incident timestamp as `realNow + clockOffsetMs`.
- Cloud Tasks are scheduled in real time: `scheduleTime = realNow + timerSeconds`.
- The web computes story-now as `Date.now() + demo.clockOffsetMs` for every countdown and every "minutes since alert" display. Never compare a stored timestamp with the raw client clock.

Example: recording at 20:00 Huế on 17/10 (`2026-10-17T13:00:00Z`) for the stroke gives `clockOffsetMs = -151020000`.

Story start per scenario:

| Scenario | Local story time | Bà Mai storyStart (UTC) | Margaret storyStart (UTC) |
|---|---|---|---|
| STROKE | 16/10 02:03 | 2026-10-15T19:03:00Z | 2026-10-15T15:03:00Z |
| FALL | 16/10 03:12 | 2026-10-15T20:12:00Z | 2026-10-15T16:12:00Z |
| FALSE_ALARM | 16/10 10:42 | 2026-10-16T03:42:00Z | 2026-10-15T23:42:00Z |

## 2. Firestore collections

Only core-api writes `incidents` and `demo`. Minh's one-off job writes `forecasts` and `families`. Seed data (`people`, `hospitals`) is loaded by a script in `/data`. The web app only reads.

### 2.1 `people/{personId}`

One collection for the older person and the Health Circle members.

```json
{
  "displayName": "Bà Mai",
  "age": 78,
  "sex": "F",
  "timezone": "Asia/Ho_Chi_Minh",
  "locale": "vi-VN",
  "dialect": "HUE",
  "emergencyNumber": "115",
  "addressText": "12 Kiệt 4, Hương Thủy, Huế (fictional)",
  "location": { "lat": 16.4, "lng": 107.6 },
  "accessibility": { "hearing": "LOSS" },
  "baseline": { "restingHr": 64, "nightHr": 58 },
  "circle": [
    { "memberId": "ong-hung", "relation": "brother", "role": "NEARBY", "priority": 1, "criticalAlerts": true },
    { "memberId": "lan", "relation": "daughter", "role": "DISTANT", "priority": 2, "criticalAlerts": true },
    { "memberId": "tuan", "relation": "son", "role": "DISTANT", "priority": 3, "criticalAlerts": false }
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `dialect` | `HUE` \| `SOUTH` \| `STANDARD` | person only | Drives forms of address |
| `emergencyNumber` | string | person only | Number shown and logged for `CALLED_115`; a missing value is logged as `115`; Bà Mai `115`, Margaret `000` |
| `accessibility.hearing` | `NORMAL` \| `LOSS` | person only | `LOSS`: the person screen shows each spoken question as large captions too |
| `circle` | array | person only | Members without `criticalAlerts: true` are never notified |
| `circle[].role` | `NEARBY` \| `DISTANT` | yes | `NEARBY` can come to the door; `DISTANT` coordinates and calls the emergency number (`emergencyNumber`) |

Margaret Collins, 78, lives in Marrickville, Sydney (`en-AU`, no `dialect`). Her circle is `david` (NEARBY 1), `aisha` (NEARBY 2), `james` (DISTANT 3) and `sarah` (DISTANT 4, no critical alerts).

Members (`ong-hung`, `lan`, `tuan`, `david`, `aisha`, `james`, `sarah`) have `displayName`, `timezone`, `locale`, `location` and no other fields. Lan's timezone is `Asia/Tokyo`.

### 2.2 `hospitals/{hospitalId}`

```json
{ "name": "Stroke Center A (demo)", "location": { "lat": 16.46, "lng": 107.59 }, "strokeReady": true }
```

Hand-written list. Seed one stroke-ready hospital and one closer hospital with `strokeReady: false`, so the demo shows that the agent picks the capable one, not the nearest. Sydney has the same pair: `sydney-stroke-center` (stroke-ready) and `marrickville-clinic` (closer, not stroke-ready).

### 2.3 `incidents/{incidentId}`

```json
{
  "personId": "ba-mai",
  "scenario": "STROKE",
  "status": "ESCALATING",
  "level": "EMERGENCY",
  "version": 9,
  "createdAt": "2026-10-15T19:03:00Z",
  "updatedAt": "2026-10-15T19:05:10Z",
  "alert": { "kind": "HR_HIGH_NO_MOVEMENT", "at": "2026-10-15T19:03:00Z", "hr": 142, "movementMin": 4 },
  "lastKnownWellAt": "2026-10-15T18:55:00Z",
  "verify": { "isReal": true, "reason": "HR 142 at night, baseline 58, no movement for 4 min", "fallback": false },
  "checkIn": {
    "mode": "VOICE",
    "noReplyCount": 0,
    "busy": false,
    "done": true,
    "turns": [
      { "by": "AGENT", "at": "2026-10-15T19:04:00Z", "text": "Mạ ơi, Lan nhờ con hỏi thăm mạ. Mạ có nghe con nói không?", "audioPath": "audio/alert-123/0-agent.mp3" },
      { "by": "PERSON", "at": "2026-10-15T19:04:12Z", "text": "Ừ... mạ nghe", "audioPath": "audio/alert-123/1-person.webm",
        "assessment": { "clarity": "SLURRED", "coherent": true, "symptoms": [], "confidence": 0.8 } }
    ]
  },
  "triage": { "reasons": ["slurred speech", "HR 142 without activity"], "fallback": false },
  "personInstruction": { "scriptIds": ["SIT_STILL", "HELP_COMING"], "text": "Mạ ngồi yên, đừng cố đứng dậy. Cậu Hùng đang tới.", "audioPath": "audio/alert-123/instruction.mp3" },
  "assignments": [
    { "memberId": "ong-hung", "role": "NEARBY", "message": "Chị Mai có thể đang bị đột quỵ. Nhà cách anh 6 phút.",
      "actions": ["ACCEPT", "DECLINE"], "etaMin": 6, "state": "ACCEPTED", "attempt": 1,
      "notifiedAt": "2026-10-15T19:04:30Z", "deadlineAt": "2026-10-15T19:09:30Z", "respondedAt": "2026-10-15T19:05:10Z" },
    { "memberId": "lan", "role": "DISTANT", "message": "Mẹ có dấu hiệu đột quỵ. Cậu Hùng đã được báo.",
      "actions": ["CALL_PERSON", "CALLED_115"], "state": "NOTIFIED", "notifiedAt": "2026-10-15T19:04:30Z" }
  ],
  "ownerId": "ong-hung",
  "escalationTaskName": "projects/.../queues/escalation/tasks/alert-123-ong-hung-1",
  "callScript": "Địa chỉ 12 Kiệt 4, Hương Thủy. Bà Mai, 78 tuổi, nữ. Nói ngọng từ khoảng 02:04. Bình thường lần cuối 01:55. Đang dùng amlodipine 5mg, aspirin. Dị ứng penicillin.",
  "handoff": {
    "hospitalId": "stroke-center-a", "hospitalName": "Stroke Center A (demo)", "etaMin": 14,
    "status": "RECEIVED", "sentAt": "2026-10-15T19:07:00Z",
    "packet": { "...": "see 4.4" }
  },
  "timeline": [
    { "at": "2026-10-15T19:03:00Z", "actor": "SYSTEM", "kind": "ALERT", "text": "HR 142, no movement 4 min" },
    { "at": "2026-10-15T19:05:10Z", "actor": "ong-hung", "kind": "ACCEPTED", "text": "Ông Hùng is on the way" }
  ],
  "demo": { "timerSeconds": 30, "noReplySeconds": 15, "clockOffsetMs": -151020000 }
}
```

| Field | Type | Notes |
|---|---|---|
| `scenario` | `STROKE` \| `FALL` \| `FALSE_ALARM` | Set by the demo trigger |
| `status` | `VERIFYING` \| `CHECKING_IN` \| `ESCALATING` \| `ON_SCENE` \| `CLOSED` | See section 3 |
| `level` | `OK` \| `MONITOR` \| `COME_NOW` \| `EMERGENCY` | Absent until triage. The only place the level is stored |
| `version` | int | +1 on every write, in the same transaction |
| `alert.kind` | `HR_HIGH_NO_MOVEMENT` \| `FALL_IMPACT_NO_MOVEMENT` \| `HR_HIGH_WITH_ACTIVITY` | |
| `checkIn.mode` | `VOICE` \| `LARGE_TEXT` | `LARGE_TEXT` shows the question and Yes/No buttons |
| `checkIn.busy` | bool | `true` while a turn is being processed; the person screen disables input |
| `checkIn.pending` | object `{ text, kind, audioPath }` | The question the person screen shows now. Absent when `done` or `busy` |
| `checkIn.pending.kind` | `VOICE` \| `YES_NO` | Decided by respond-agent |
| `turns[].by` | `AGENT` \| `PERSON` | |
| `turns[].assessment` | object | Only on `PERSON` turns with audio. Absent for Yes/No and no-reply turns. A Yes/No answer is stored as a PERSON turn with text `Yes`/`No` when the person's `locale` starts with `en`, otherwise `Có`/`Không`. The `ANSWERED` timeline entry uses the same text |
| `assessment.clarity` | `CLEAR` \| `SLURRED` \| `NO_SPEECH` | |
| `assignments[].state` | `QUEUED` \| `NOTIFIED` \| `ACCEPTED` \| `DECLINED` \| `EXPIRED` \| `ARRIVED` | `QUEUED`: a NEARBY member not notified yet. Screens show nothing for `QUEUED` |
| `assignments[].actions` | array | Buttons the member's screen shows. `ACCEPT`, `DECLINE`, `ARRIVED`, `CALLED_115` post to core-api. `CALL_PERSON` and `CALL_NEARBY` are client-only call buttons with no server write |
| `assignments[].attempt` | int | NEARBY only. Used in the Cloud Task name |
| `handoff.status` | `PENDING` \| `RECEIVED` \| `FAILED` | core-api writes `PENDING` before calling `/handoff` |
| `timeline[].actor` | `SYSTEM` \| `AGENT` \| `PERSON` \| a memberId | |
| `timeline[].kind` | `ALERT` \| `VERIFIED` \| `FALSE_ALARM` \| `ASKED` \| `ANSWERED` \| `NO_REPLY` \| `TRIAGED` \| `NOTIFIED` \| `ACCEPTED` \| `DECLINED` \| `EXPIRED` \| `NO_NEARBY` \| `ARRIVED` \| `CALLED_115` \| `HANDOFF_SENT` \| `HANDOFF_RECEIVED` \| `HANDOFF_FAILED` \| `AGENT_FALLBACK` \| `CLOSED` | |
| `*.fallback` | bool | `true` when the agent used its deterministic fallback; the timeline also gets an `AGENT_FALLBACK` entry |

Assignments also get `arrivedAt` when the owner taps "Arrived". "Minutes to a person at the door" is not stored: the web computes it as that `arrivedAt` minus `alert.at`.

Size check: audio lives in Storage, so an incident stays small (at most 8 turns, about 25 timeline entries, about 20 writes).

### 2.4 `forecasts/{personId}`

Written once by Minh's job from BigQuery `AI.FORECAST`. Story day 0 is 2026-08-14, so day 21 is 2026-09-04 and day 63 is the stroke night of 2026-10-16 (Huế time). The synthetic `vitals_daily` series covers day 0 to day 63. The day-21 forecast uses days 0 to 21 and predicts 30 days ahead.

```json
{
  "asOf": "2026-09-04T00:00:00Z",
  "storyDay": 21,
  "method": "BigQuery AI.FORECAST on a synthetic daily series",
  "risks": [
    { "condition": "STROKE", "horizonDays": 90, "level": "HIGH" },
    { "condition": "FALL", "horizonDays": 30, "level": "MEDIUM" }
  ],
  "drivers": ["Morning BP up 14 mmHg over 6 weeks", "3 missed doses this week", "Father and brother had strokes before 70"],
  "action": { "text": "Share BP trend with the clinic; Uncle Hùng sets up a pill box on Saturday", "ownerMemberId": "ong-hung" },
  "series": [ { "date": "2026-08-14", "systolic": 132 }, { "date": "2026-10-04", "systolicForecast": 151, "lower": 144, "upper": 158 } ]
}
```

`risks[].level` is `LOW` \| `MEDIUM` \| `HIGH`, set by rules over the forecast and family history, then explained by Gemini. No probabilities are stored or shown.

### 2.5 `families/{personId}`

```json
{
  "members": [
    { "id": "ong-tu", "name": "Ông Tư", "relation": "father", "generation": 0, "deceased": true, "conditions": [ { "label": "stroke", "ageAtOnset": 68 }, { "label": "hypertension" } ] },
    { "id": "ba-mai", "name": "Bà Mai", "relation": "self", "generation": 1, "parentId": "ong-tu", "conditions": [ { "label": "hypertension" }, { "label": "hearing loss" } ] },
    { "id": "lan", "name": "Lan", "relation": "daughter", "generation": 2, "parentId": "ba-mai", "conditions": [] }
  ],
  "flags": [
    { "memberId": "lan", "screening": "Blood pressure check", "reason": "Mother and grandfather with hypertension; grandfather stroke at 68", "explanation": "Plain-language text from Gemini" }
  ]
}
```

### 2.6 `demo/current`

```json
{ "incidentId": "alert-123", "scenario": "STROKE", "personId": "ba-mai", "startedAt": "2026-10-15T19:03:00Z" }
```

Every role screen subscribes to this document, then to the incident it points to. The person screen autoplays when `checkIn.pending.audioPath` or `personInstruction.audioPath` changes, not on every `version` change.

## 3. Incident state machine (core-api)

```
VERIFYING --false alarm--------------------------------------------> CLOSED
VERIFYING --real---> CHECKING_IN --level OK or MONITOR--------------> CLOSED
                     CHECKING_IN --level COME_NOW or EMERGENCY--> ESCALATING --owner ARRIVED--> ON_SCENE
any status except CLOSED --CLOSE from console--> CLOSED
```

1. `POST /alerts` creates the incident in `VERIFYING` (see redelivery rule), then calls `/verify`.
2. If `isReal` is false: timeline `FALSE_ALARM`, status `CLOSED`. Nobody is notified.
3. Otherwise `CHECKING_IN`: call `/checkin/turn` with no input to get the first question. Each person reply triggers one more call. The loop ends when the agent returns `done: true`, when `noReplyCount` reaches 2, or after 4 agent turns, whichever comes first. core-api then sets `checkIn.done = true`.
4. Call `/triage` and write `level`. `OK` or `MONITOR`: timeline note, `CLOSED`.
5. `COME_NOW` or `EMERGENCY`: compute `etaMin` for each NEARBY member with Maps Routes (omit if Routes fails), call `/plan`, write `personInstruction`, `callScript` and assignments, status `ESCALATING`.
6. Escalation order is deterministic, not chosen by the LLM:
   - All `DISTANT` members with `criticalAlerts` are notified at once, without a timer.
   - `NEARBY` members are notified one at a time by `priority`. Each gets `deadlineAt = notifiedAt + timerSeconds` and a Cloud Task. All NEARBY assignments are written at once in priority order; the ones not yet notified are `QUEUED`.
   - When the last `NEARBY` member expires or declines: timeline `NO_NEARBY`, and every `DISTANT` assignment gets `actions: ["CALL_NEARBY", "CALLED_115"]`.
7. `EMERGENCY` only: write `handoff.status: PENDING`, then call `/handoff` right after `/plan`, in parallel with escalation. Pick the nearest hospital with `strokeReady: true` when stroke is suspected (any `SLURRED` turn), the nearest hospital otherwise. ETA from Maps Routes. Hospitals more than about 500 km from the person are ranked by straight-line distance and get no Routes ETA call. `etaMin` is omitted when the chosen hospital has no Routes ETA, in the handoff, the `/handoff` body and the packet. On success write the packet and `RECEIVED`; on `AGENT_FAILED` write `FAILED` and timeline `HANDOFF_FAILED`.
8. `ARRIVED` from the owner moves status to `ON_SCENE`. The demo console closes the incident.

### Action rules

| Action | Allowed when | Effect |
|---|---|---|
| `ACCEPT` | `ownerId` is `null` and the member's assignment is `NOTIFIED` or `EXPIRED` | In a transaction: set `ownerId`, assignment `ACCEPTED`, `respondedAt`. After commit, delete the pending Cloud Task. Accepting after `EXPIRED` is allowed: that is how the fall scenario recovers |
| `ACCEPT` | `ownerId` is another member | `409 ALREADY_OWNED` with the owner's name |
| `ACCEPT` | `ownerId` is this member | `200`, no change |
| `DECLINE` | assignment `NOTIFIED` | Assignment `DECLINED`, timeline `DECLINED`. After commit, delete its task and notify the next NEARBY at once (or apply the last-NEARBY rule) |
| `ARRIVED` | sender is `ownerId` | Assignment `ARRIVED`, `arrivedAt`, status `ON_SCENE`. Anyone else gets `409 INVALID_STATE` |
| `CALLED_115` | any notified member | Timeline `CALLED_115` with text `{member} called {emergencyNumber}`. No state change |
| `CLOSE` | `memberId` is `console`, status not `CLOSED` | Status `CLOSED`, timeline `CLOSED` |

### Reliability rules

- **Redelivery of alerts:** Pub/Sub push is at least once. `/alerts` creates the incident in a transaction. If the document already exists, it returns `204` at once and does no further work. Otherwise it returns `204` right after the create and continues processing in the request (Cloud Run with CPU always allocated). Push subscription ack deadline: 120 s.
- **Task deletion:** deleting a Cloud Task after accept or decline is best effort. Ignore `NOT_FOUND` and any failure. The timeout guard makes a stray task harmless.
- **Timeout handler:** escalate only if that assignment is still `NOTIFIED` and `ownerId` is still `null`; otherwise return `200` and do nothing. When it does escalate, it first creates the next member's task with its deterministic name (treat `ALREADY_EXISTS` as success), then commits `EXPIRED` and the new assignment in one transaction. A retry after a crash therefore finishes the job.
- **Task names:** `{incidentId}-{memberId}-{attempt}`. Never reuse a name within one incident. Cloud Tasks blocks deleted or executed names for hours, which is safe because every demo run has a new incident ID.
- **Check-in in flight:** a `POST /api/incidents/{id}/checkin` while `checkIn.busy` is `true` returns `409 INVALID_STATE`.
- **No reply:** the person screen posts `noReply` after `demo.noReplySeconds` without a recording. core-api increments `noReplyCount`. At 1, it calls `/checkin/turn` with the new count; the agent returns `next.kind: YES_NO`, and core-api sets `mode` to `LARGE_TEXT`. At 2, check-in ends and triage runs.
- **Determinism:** agents call Gemini with temperature 0 and a pinned model version. If structured output fails twice, the agent returns its rule-based result with `fallback: true`.

## 4. Service interfaces

All bodies are JSON unless stated. Errors use one shape:

```json
{ "error": { "code": "ALREADY_OWNED", "message": "Ông Hùng is already on the way" } }
```

| HTTP | code |
|---|---|
| 400 | `INVALID_REQUEST` |
| 401 | `UNAUTHENTICATED` |
| 404 | `NOT_FOUND` |
| 409 | `ALREADY_OWNED`, `INVALID_STATE` |
| 502 | `AGENT_FAILED` |

### 4.1 core-api public routes (`https://noonealone.insidesync.ai/api/...`, Firebase ID token in `Authorization: Bearer`)

The anonymous token only proves the call comes from our web app. The demo has no per-member login: each role screen sends the `memberId` it represents, and anyone with the hosting URL can trigger `POST /api/demo/*`. Do not share the URL outside the team before recording. These are stated demo limits.

**`POST /api/demo/{scenario}`** with `scenario` in `stroke`, `fall`, `false-alarm`

```json
{ "timerSeconds": 30, "noReplySeconds": 15, "personId": "margaret" }
```

`personId` is optional and defaults to `ba-mai`. A `personId` that is not an older person in the seed returns `400 INVALID_REQUEST`.

Response `202`:
```json
{ "incidentId": "alert-1760555000000-stroke" }
```
Computes `clockOffsetMs`, publishes the alert to Pub/Sub topic `alerts` and sets `demo/current`. Rejects with `409 INVALID_STATE` if `demo/current` points to an incident that is not `CLOSED`.

**`POST /api/demo/reset`** → `204`. Deletes the current incident and its audio, cancels its pending Cloud Tasks (best effort), re-seeds `people` and `hospitals`, clears `demo/current`. Run it once after the first deploy to load the seed.

**`POST /api/incidents/{id}/checkin`** from the person screen. One of:

- `multipart/form-data` with field `audio` (`audio/webm`, max 30 s)
- `{ "yesNo": "YES" }` or `{ "yesNo": "NO" }`
- `{ "noReply": true }`

Response `202`, or `409 INVALID_STATE` while `checkIn.busy`. The result appears in Firestore.

**`POST /api/incidents/{id}/actions`**

```json
{ "memberId": "ong-hung", "action": "ACCEPT" }
```
`action` is `ACCEPT` \| `DECLINE` \| `ARRIVED` \| `CALLED_115` \| `CLOSE`. Rules in section 3. Response `200` with `{ "version": 10 }`, or an error.

### 4.2 core-api internal routes (`run.app` URL only, OIDC only)

Both endpoints check the OIDC token's `aud` (the core-api service URL) and the caller's service account email.

**`POST /alerts`**: Pub/Sub push. `message.data` is base64 of:

```json
{ "alertId": "alert-1760555000000-stroke", "personId": "ba-mai", "scenario": "STROKE",
  "kind": "HR_HIGH_NO_MOVEMENT", "hr": 142, "movementMin": 4,
  "demo": { "timerSeconds": 30, "noReplySeconds": 15, "clockOffsetMs": -151020000 } }
```

**`POST /tasks/escalation-timeout`**: Cloud Tasks.

```json
{ "incidentId": "alert-1760555000000-stroke", "memberId": "ong-hung", "attempt": 1 }
```
Returns `200` even when it does nothing.

### 4.3 respond-agent (private, called by core-api with OIDC)

Each response carries `"fallback": true|false`.

**`POST /verify`**
```json
{
  "person": { "age": 78, "baseline": { "restingHr": 64, "nightHr": 58 } },
  "alert": { "kind": "HR_HIGH_NO_MOVEMENT", "at": "2026-10-15T19:03:00Z", "hr": 142, "movementMin": 4 },
  "window": [ { "at": "2026-10-15T18:55:00Z", "hr": 60, "steps": 12, "moving": true } ]
}
```
```json
{ "isReal": true, "reason": "HR 142 at night, baseline 58, no movement for 4 min", "lastKnownWellAt": "2026-10-15T18:55:00Z", "fallback": false }
```
`window` covers the 15 minutes before the alert, one point per minute, in story time. core-api builds it from the scenario fixture in `core-api/src/main/resources/data/scenarios/{scenario}.json`. core-api copies `lastKnownWellAt` to the incident's top level.

**`POST /checkin/turn`**
```json
{
  "incidentId": "alert-123",
  "person": { "displayName": "Bà Mai", "dialect": "HUE", "locale": "vi-VN", "accessibility": { "hearing": "LOSS" },
              "callerName": "Lan", "callerRelation": "daughter" },
  "turns": [ { "by": "AGENT", "text": "..." }, { "by": "PERSON", "text": "...", "assessment": { "clarity": "SLURRED" } } ],
  "noReplyCount": 0,
  "input": { "audioBase64": "...", "mimeType": "audio/webm" }
}
```
`turns` are the same objects as `checkIn.turns`, without audio paths. `input` is one of `{ "audioBase64", "mimeType" }`, `{ "yesNo": "YES" }`, `{ "noReply": true }`, or absent for the first turn.
```json
{
  "transcript": "Ừ... mạ nghe",
  "assessment": { "clarity": "SLURRED", "coherent": true, "symptoms": [], "confidence": 0.8 },
  "next": { "text": "Mạ nhắc lại giúp con: hôm nay trời đẹp.", "kind": "VOICE", "audioBase64": "...", "mimeType": "audio/mpeg" },
  "done": false,
  "fallback": false
}
```
`transcript` and `assessment` are present only when `input` was audio. `next.kind` is `YES_NO` whenever `noReplyCount >= 1`. `next` is absent when `done` is true. core-api stores audio in Cloud Storage under `audio/{incidentId}/{turnIndex}-{agent|person}.{mp3|webm}` and writes the paths.

**`POST /triage`**
```json
{ "alert": { "kind": "HR_HIGH_NO_MOVEMENT", "hr": 142 }, "verify": { "isReal": true }, "turns": [ ], "noReplyCount": 0 }
```
```json
{ "level": "EMERGENCY", "reasons": ["slurred speech", "HR 142 without activity"], "fallback": false }
```
Rules override the model: any `SLURRED` turn gives `EMERGENCY`; `noReplyCount >= 2` gives at least `COME_NOW`.

**`POST /plan`**
```json
{
  "person": { "displayName": "Bà Mai", "dialect": "HUE", "locale": "vi-VN", "timezone": "Asia/Ho_Chi_Minh", "addressText": "..." },
  "level": "EMERGENCY",
  "context": { "lastKnownWellAt": "2026-10-15T18:55:00Z", "findings": ["slurred speech"], "meds": ["amlodipine 5mg", "aspirin"], "allergies": ["penicillin"] },
  "members": [ { "memberId": "ong-hung", "displayName": "Ông Hùng", "relation": "brother", "role": "NEARBY", "locale": "vi-VN", "etaMin": 6 },
               { "memberId": "lan", "displayName": "Lan", "relation": "daughter", "role": "DISTANT", "locale": "vi-VN" } ]
}
```
```json
{
  "messages": [ { "memberId": "ong-hung", "text": "Chị Mai có thể đang bị đột quỵ. Nhà cách anh 6 phút." },
                { "memberId": "lan", "text": "Mẹ có dấu hiệu đột quỵ. Cậu Hùng đã được báo." } ],
  "callScript": "Địa chỉ ... Bình thường lần cuối 01:55 ...",
  "personInstruction": { "scriptIds": ["SIT_STILL", "HELP_COMING"], "text": "Mạ ngồi yên, đừng cố đứng dậy. Cậu Hùng đang tới.", "audioBase64": "...", "mimeType": "audio/mpeg" },
  "fallback": false
}
```
core-api reads `meds` and `allergies` from the scenario fixture, not from FHIR. `personInstruction.text` is built only from the safety script library (`/agents/respond/scripts.json`). The model picks `scriptIds` and fills names and forms of address; it never writes new safety instructions. Times inside `callScript` are rendered in the person's timezone. core-api stores the audio at `audio/{incidentId}/instruction.mp3`.

**`POST /handoff`**
```json
{ "incidentId": "alert-123", "personId": "ba-mai", "level": "EMERGENCY", "suspected": "STROKE",
  "lastKnownWellAt": "2026-10-15T18:55:00Z", "findings": ["slurred speech 02:04", "HR 142"],
  "onScene": { "name": "Ông Hùng", "relation": "brother" },
  "hospital": { "id": "stroke-center-a", "name": "Stroke Center A (demo)", "etaMin": 14 } }
```
```json
{ "status": "RECEIVED", "packet": { }, "fallback": false }
```
`status` is `RECEIVED` or `FAILED`. respond-agent forwards the request to hospital-agent over A2A and returns its result.

### 4.4 hospital-agent (private, A2A)

respond-agent sends one A2A message whose single part is a data part (or JSON text) equal to the `/handoff` body. hospital-agent reads Patient, Condition, MedicationStatement, AllergyIntolerance and FamilyMemberHistory for Patient `personId` from the FHIR store, and replies with this JSON as text. respond-agent parses it.

```json
{
  "patient": { "name": "Bà Mai", "age": 78, "sex": "F" },
  "suspected": "STROKE",
  "lastKnownWellAt": "2026-10-15T18:55:00Z",
  "findings": ["slurred speech 02:04", "HR 142"],
  "conditions": ["hypertension", "hearing loss"],
  "medications": [ { "name": "amlodipine", "dose": "5 mg daily" }, { "name": "aspirin", "dose": "81 mg daily" } ],
  "allergies": ["penicillin"],
  "communication": ["HARD_OF_HEARING"],
  "baseline": "Lives alone, independent",
  "contact": { "name": "Ông Hùng", "relation": "brother", "onScene": true },
  "etaMin": 14,
  "text": "PRE-ARRIVAL · ETA 14 min\nBà Mai, 78, F ..."
}
```
`communication` values: `HARD_OF_HEARING`, `COGNITIVE_IMPAIRMENT`. `baseline` is a constant in the agent prompt; FHIR has no source for it.

A2A in ADK is experimental. Pin `google-adk` and `a2a-sdk` versions in each agent's `requirements.txt`. Minh's spike on 14/10 must prove that respond-agent can call a private Cloud Run hospital-agent with an OIDC token over A2A. If it cannot by 22:00 on 15/10, respond-agent calls hospital-agent over plain HTTP with the same JSON and the deck drops the A2A claim.

## 5. Other stores

| Store | Name | Owner | Content |
|---|---|---|---|
| Cloud Storage (Firebase Storage) | default bucket, `audio/` | core-api writes | Agent and person audio. Clients read with auth |
| Pub/Sub | topic `alerts`, push subscription to `/alerts`, ack deadline 120 s | Dũng | Alert messages from section 4.2 |
| Cloud Tasks | queue `escalation` | Dũng | Escalation timers |
| Cloud Healthcare API | dataset `noa`, FHIR R4 store `records` | Minh | Bà Mai's bundle |
| BigQuery | dataset `noa`, table `vitals_daily` | Minh | `person_id STRING, date DATE, systolic INT64, diastolic INT64, resting_hr INT64, steps INT64, meds_taken INT64, meds_scheduled INT64` |
| Repo | `core-api/src/main/resources/data/scenarios/{scenario}.json` | Dũng | 15-minute vitals window, meds and allergies per scenario |
| Repo | `core-api/src/main/resources/data/seed.json` | Dũng | people and hospitals loaded by reset |

## 6. Security

- Firestore and Storage rules: read if `request.auth != null`; write never from clients.
- core-api public routes verify the Firebase ID token. `/alerts` and `/tasks/*` verify the OIDC token's audience and service account email.
- respond-agent and hospital-agent run with `--no-allow-unauthenticated`. Callers use service account OIDC.
- No keys in the repo. Runtime config comes from environment variables and Secret Manager. The Firebase web config is public by design and may be committed.
- `noonealone.insidesync.ai` is listed in Firebase Authentication > Authorized domains; without it anonymous sign-in fails on the custom domain.
