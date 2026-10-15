# Second character (Margaret) in core-api: design

Date 15/10. Owner: Dũng. Approved in chat on 15/10.

## Why

The design artifact and the web use Margaret Collins, 78, Marrickville, Sydney. The contract, the core-api seed and the video use Bà Mai, 78, Huế. We keep both. Bà Mai stays the default and the video story. Margaret can run the same three demo scenarios end to end.

## Scope

In scope: core-api and `docs/contract.md` only.

Out of scope, each owner picks it up from the contract change:

- Web (Hải): character switch, send `personId` on demo calls, read `demo/current.personId`.
- respond-agent (Tài): English questions and messages when `locale` is `en-AU`.
- hospital-agent, FHIR and forecast (Minh): a FHIR bundle, `forecasts/margaret` and `families/margaret`.

## Seed data (`core-api/src/main/resources/data/seed.json`)

New person `margaret`:

| Field | Value |
|---|---|
| displayName | Margaret Collins |
| age, sex | 78, F |
| timezone | Australia/Sydney |
| locale | en-AU |
| dialect | omitted |
| addressText | 14 Wilga Street, Marrickville NSW 2204 (fictional) |
| location | -33.9105, 151.1553 |
| accessibility.hearing | LOSS (hearing aids in both ears) |
| baseline | restingHr 63, nightHr 57 |
| emergencyNumber | 000 |

Margaret's circle:

| memberId | displayName | relation | role | priority | criticalAlerts | location |
|---|---|---|---|---|---|---|
| david | David | son | NEARBY | 1 | true | about 450 m away |
| aisha | Aisha | neighbour (key holder) | NEARBY | 2 | true | next door |
| james | James | son | DISTANT | 3 | true | Melbourne |
| sarah | Sarah | daughter | DISTANT | 4 | false | Brisbane |

Members carry `displayName`, `timezone`, `locale` and `location` only, as for Bà Mai's circle.

Bà Mai gets `emergencyNumber: "115"`.

Two Sydney hospitals, same pattern as Huế (one stroke-ready, one closer that is not):

- `sydney-stroke-center`: "Sydney Stroke Center (demo)", near Camperdown, `strokeReady: true`.
- `marrickville-clinic`: "Marrickville Clinic (demo)", closer to Margaret, `strokeReady: false`.

Handoff logic does not change. It already picks the stroke-ready hospital with the shortest ETA and falls back to distance, so Margaret gets the Sydney hospital and Bà Mai keeps Stroke Center A.

## Demo trigger

`POST /api/demo/{scenario}` body gains an optional `personId`:

```json
{ "timerSeconds": 30, "noReplySeconds": 15, "personId": "margaret" }
```

- Missing `personId` means `ba-mai`, so existing callers keep working.
- A `personId` that is not an older person in the seed (no `circle`) returns `400 INVALID_REQUEST` "Unknown person".
- The scenario fixture keeps its heart-rate window. The alert's `personId` comes from the request, not the fixture.
- `demo/current` gains `personId`, so every screen knows whose incident it is.

## Story clock

Each scenario keeps one local wall-clock time, not one instant:

| Scenario | Local story time |
|---|---|
| STROKE | 2026-10-16 02:03 |
| FALL | 2026-10-16 03:12 |
| FALSE_ALARM | 2026-10-16 10:42 |

`storyStart` is that local time in the person's `timezone`. For Bà Mai (`Asia/Ho_Chi_Minh`) this gives the same instants as today (stroke `2026-10-15T19:03:00Z`). For Margaret (`Australia/Sydney`, AEDT, UTC+11) the stroke is `2026-10-15T15:03:00Z`.

`clockOffsetMs = storyStart(person) - realNow`, and `demo/current.startedAt` is the same `storyStart`. Everything downstream already uses the offset.

## Emergency number

- `people/{personId}.emergencyNumber` is a new optional string on the older person.
- The `CALLED_115` action and timeline kind keep their names, so the web contract does not break.
- The timeline text reads "{member} called {emergencyNumber}", falling back to 115 when the field is missing.

## Contract changes (v1.4)

- 1. Conventions: seed IDs list adds `margaret`.
- Story clock: the table lists local times, and storyStart depends on the person's timezone.
- 2.1 people: `emergencyNumber`, the `margaret` example fields, and the Margaret circle IDs.
- 2.2 hospitals: the two Sydney hospitals.
- 2.6 demo/current: `personId`.
- 4.1 demo trigger: optional `personId` and the 400 case.

## Error handling

- Unknown `personId`: 400 before anything is written or published.
- Person without `timezone`: treated as `Asia/Ho_Chi_Minh`, the seed default.
- The 409 rule for a running incident is unchanged and applies across people: one demo incident at a time.

## Tests

Each test records the production edit that turns it red.

1. Trigger with `personId: margaret` publishes an alert with `personId` margaret, and `demo/current.personId` is margaret. Red edit: keep using the fixture's `personId`.
2. Trigger without `personId` still runs for `ba-mai`. Red edit: default to null.
3. Unknown `personId` returns 400 and publishes nothing. Red edit: drop the seed check.
4. Story clock: STROKE for Bà Mai gives `2026-10-15T19:03:00Z`, for Margaret `2026-10-15T15:03:00Z`. Red edit: ignore the person's zone.
5. Margaret's stroke hands off to `sydney-stroke-center`, not `marrickville-clinic`. Red edit: drop the `strokeReady` filter.
6. `CALLED_115` on a Margaret incident logs "called 000"; on a Bà Mai incident "called 115". Red edit: hardcode 115.

## Not doing

- No per-person scenario fixtures. The heart-rate window is the same story for both.
- No rename of `CALLED_115`.
- No change to escalation, check-in or handoff logic, except: Yes/No answers are logged as "Yes"/"No" for an `en` locale, and handoff skips Routes calls to hospitals over about 500 km away.
