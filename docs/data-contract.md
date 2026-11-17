# Data contract: fields added for the Abu Dhabi story

These fields are additive. Old documents do not have them, so readers must accept a missing field. A field is never null: it is either present or absent.

## Chat language

`POST /api/chat`

```json
{ "question": "Who is with her?", "mode": "fam", "viewer": "james", "history": [], "lang": "ar" }
```

- `lang` is optional: `"en"` or `"ar"`. Missing means `"en"`.
- Any other value (including `"EN"` and `""`) returns 400 `INVALID_REQUEST` ("lang must be en or ar").
- The response is still `{ "answer": "..." }`. 502 `CHAT_UNAVAILABLE` is unchanged.

## Timeline entries

`incidents/{id}.timeline[]`

```json
{ "at": "2026-10-15T22:03:30Z", "actor": "SYSTEM", "kind": "NOTIFIED", "text": "Calling Hamad: ...",
  "memberId": "david", "params": { "etaMin": 6, "attempt": 1 } }
```

`memberId` and `params` may be absent. `actor` for a member's action is already the `memberId`.
`params` by `kind`:

| kind | memberId | params |
|---|---|---|
| `ALERT` | | `hr`, `movementMin` |
| `VERIFIED`, `FALSE_ALARM` | | `hr`, `movementMin` |
| `AGENT_FALLBACK` | | `step`: `VERIFY`, `CHECKIN`, `TRIAGE`, `PLAN` or `HANDOFF` |
| `ASKED` | | `step`: `OPENING`, `SPEECH_CHECK`, `SYMPTOMS` or `YES_NO` (absent with an old respond agent) |
| `ANSWERED` | | `answer`: `YES` or `NO` (buttons), or `noSpeech: true`; a spoken answer with text has no params |
| `NO_REPLY` | | `count` |
| `TRIAGED` | | `level`, `reasons` (array) |
| `ALERTED` | | `memberIds` (array, DISTANT members first), `suspectedStroke` |
| `NOTIFIED` | yes | `etaMin`, `attempt` (both optional) |
| `EXPIRED` | yes | `seconds`, `voicemail` |
| `ACCEPTED`, `DECLINED`, `ARRIVED` | yes | |
| `NO_NEARBY` | | |
| `CALLED_115` | yes when a member pressed the button (`actor` is the memberId); no for the automatic call (`actor` is `SYSTEM`) | `number`, for example `"998"` |
| `HANDOFF_SENT` | | `hospitalId`, `etaMin` |
| `HANDOFF_RECEIVED`, `HANDOFF_FAILED` | | `hospitalId` |
| `FAMILY_UPDATE` | `ownerId` when someone is on the way | `hospitalId`, `ownerId` (optional) |
| `CLOSED` | | `by`: `CHECKIN` or `CONSOLE` |
| `DISCHARGED` | | `staffName` |

The scripted voice question is recognised by `ASKED` with `params.step == "SPEECH_CHECK"`. Do not match its wording.

## Check-in turns and pending step

```json
"checkIn": {
  "turns": [{ "by": "AGENT", "at": "...", "text": "Please repeat after me: ...", "kind": "SPEECH_CHECK" },
            { "by": "PERSON", "at": "...", "text": "Yes" }],
  "pending": { "text": "...", "kind": "VOICE", "step": "SPEECH_CHECK" }
}
```

- `turns[].kind` is set only on `AGENT` turns: `OPENING`, `SPEECH_CHECK`, `SYMPTOMS` or `YES_NO`.
- `pending.step` takes the same values. `pending.kind` is still how the person answers (`VOICE` or `YES_NO`).

## Recovery key

`POST /api/incidents/{id}/recovery` accepts an optional `key` on each `meds[]` and `activities[]` item. The pattern is `^[a-z0-9_]{1,40}$`; anything else returns 400. An empty string means absent.

If the caller sends no key, core-api finds one by looking for a lowercase word in the name:

- Medicines: `apixaban`, `perindopril`, `atorvastatin`, `amlodipine`, `vitamin_d` ("vitamin d"), `aspirin`.
- Activities: `walk`, `blood_pressure` ("blood pressure"), `speech`, `water`.
- An item a doctor typed that matches none of them has no key.

```json
"recovery": {
  "meds": [{ "name": "Apixaban", "dose": "5 mg", "times": ["08:00"], "change": "New", "key": "apixaban" }],
  "activities": [{ "text": "Walk for 15 minutes", "times": ["10:00"], "key": "walk" }],
  "reminders": [{ "time": "08:00", "kind": "MED", "text": "Time for your Apixaban, 5 mg.", "key": "apixaban" }]
}
```

`reminders[].key` is the key of the matching medicine or activity, when there is one.

## Families code

`families/{personId}`, written by the `data/predict` job:

```json
{ "label": "stroke", "ageAtOnset": 74, "code": "STROKE" }
```

- `code` is one of `STROKE`, `HYPERTENSION`, `TYPE_2_DIABETES`, `PREDIABETES`, `DEMENTIA`, `HEARING_LOSS`, `CHRONIC_KIDNEY_DISEASE`, `OSTEOARTHRITIS`, `ATRIAL_FIBRILLATION`, `GLAUCOMA`. It is absent when the label is not recognised.
- The web maps `code` to its own `ConditionKey` (HTN, STR, AF, T2D, GLA, DEM, HEAR).
- Optional member fields, absent when unknown and never null: `age` (living, whole years), `deceasedAge` (age at death) and `place` (where they live, plain text, for example `Al Ain`). A condition may carry `note` (for example `138/86`). Old documents have none of them.
- `relation` is one of `self`, `father`, `mother`, `husband`, `wife`, `brother`, `sister`, `son`, `daughter`, `grandson`, `granddaughter`. Generations run from 0 (parents) to 3 (grandchildren).
- `handoff.packet.conditions` is still an array of English labels, with no codes.

## Other

- The person's spoken language is `people/{id}.locale`: `en-*` is English, `ar-*` is Arabic, anything else is English. The seed uses `en-AE`.
- The emergency number is `998`. It comes from `people/{id}.emergencyNumber`, with `998` as the default.
- `CALLED_115` (as a kind and as an action) keeps its name because it is a contract value, even though it now means the emergency call.
