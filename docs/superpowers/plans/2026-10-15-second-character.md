# Second character (Margaret) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** core-api runs the stroke, fall and false-alarm demos for either Bà Mai (Huế) or Margaret (Sydney), chosen per trigger.

**Architecture:** Margaret, her circle and two Sydney hospitals are seed data. `POST /api/demo/{scenario}` takes an optional `personId`. Each scenario keeps a local wall-clock story time that `StoryClock` places in the person's timezone. The `CALLED_115` timeline text uses the person's `emergencyNumber`.

**Tech Stack:** Java 17, Spring Boot 3.3.4, Firestore emulator via Testcontainers, JUnit 5, Mockito, AssertJ.

**Spec:** `docs/superpowers/specs/2026-10-15-second-character-design.md`

## Global Constraints

- Missing `personId` means `ba-mai`. Existing callers keep working unchanged.
- Bà Mai's story instants do not move: STROKE `2026-10-15T19:03:00Z`, FALL `2026-10-15T20:12:00Z`, FALSE_ALARM `2026-10-16T03:42:00Z`.
- Margaret's STROKE story start is `2026-10-15T15:03:00Z` (02:03 AEDT, UTC+11).
- The action code and timeline kind `CALLED_115` keep their names.
- Absent optional fields are omitted, never `null` (Docs mapper is already `NON_NULL`).
- Errors use `{ "error": { "code": "...", "message": "..." } }`; a bad `personId` is `INVALID_REQUEST` 400.
- No change to escalation, check-in or handoff logic.

## Review Focus

1. A member ID such as `david` sent as `personId`: 400, nothing published, `demo/current` untouched. Test in Task 3.
2. A Margaret trigger while a Bà Mai incident is still running: 409 `INVALID_STATE`, one demo at a time. Test in Task 3.
3. An older person without `timezone`: story time falls back to `Asia/Ho_Chi_Minh`. Test in Task 3.
4. Body with timers but no `personId`: runs for `ba-mai` with the given timers. Test in Task 3.
5. `POST /api/demo/reset` reseeds Margaret, her circle and the Sydney hospitals, not only Bà Mai. Test in Task 1.

## Working rules for implementers

- Worktree `C:\Users\PC\IdeaProjects\no-one-alone-character`, branch `feat/second-character`. The controller commits after each task; pushing needs Dũng's approval.
- Every test names a **red edit**: a one-line production change that must make it fail. Apply it, run the test, paste the failing lines into `.superpowers/sdd/2026-10-15-second-character/checks.md`, revert, run green.
- Docker Desktop must be running (Firestore emulator).
- Run tests from `core-api/` with `mvn -q -B test -Dtest=...`. Before reporting a task green, run `mvn -q -B clean test` (whole suite).
- Comments: at most one short line, only where the code cannot say it.

## File map

| File | Change | Task |
|---|---|---|
| `core-api/src/main/resources/data/seed.json` | Margaret, circle, Sydney hospitals, `emergencyNumber` | 1 |
| `core-api/src/main/java/com/noonealone/coreapi/model/Person.java` | `emergencyNumber` field | 1 |
| `core-api/src/main/java/com/noonealone/coreapi/flow/Actions.java` | "called {number}" | 1 |
| `core-api/src/test/java/com/noonealone/coreapi/flow/IncidentFlowAlertTest.java` | `stroke(id, personId)` helper | 1 |
| `core-api/src/test/java/com/noonealone/coreapi/flow/ActionsTest.java` | number text tests | 1 |
| `core-api/src/test/java/com/noonealone/coreapi/flow/HandoffTest.java` | Margaret hospital test | 1 |
| `core-api/src/test/java/com/noonealone/coreapi/flow/DemoServiceTest.java` | reset reseeds Margaret (1), personId tests (3) | 1, 3 |
| `core-api/src/main/java/com/noonealone/coreapi/model/Scenario.java` | local story time | 2 |
| `core-api/src/main/java/com/noonealone/coreapi/model/StoryClock.java` | zone-aware `storyStart`, `offsetFor` | 2 |
| `core-api/src/test/java/com/noonealone/coreapi/model/StoryClockTest.java` | zone tests | 2 |
| `core-api/src/main/java/com/noonealone/coreapi/flow/DemoService.java` | `personId`, validation, zone | 2 (compile fix), 3 |
| `core-api/src/main/java/com/noonealone/coreapi/model/DemoCurrent.java` | `personId` | 3 |
| `core-api/src/main/java/com/noonealone/coreapi/web/ApiController.java` | `DemoRequest.personId`, default | 3 |
| `core-api/src/test/java/com/noonealone/coreapi/web/ApiControllerTest.java` | personId passthrough | 3 |
| `docs/contract.md` | v1.4 | 4 |

Tasks 1 and 2 touch different files and can run in parallel. Task 3 needs Task 2. Task 4 runs last.

---

### Task 1: Margaret seed and emergency number

**Files:**
- Modify: `core-api/src/main/resources/data/seed.json`
- Modify: `core-api/src/main/java/com/noonealone/coreapi/model/Person.java`
- Modify: `core-api/src/main/java/com/noonealone/coreapi/flow/Actions.java:131-139`
- Test: `core-api/src/test/java/com/noonealone/coreapi/flow/IncidentFlowAlertTest.java`, `ActionsTest.java`, `HandoffTest.java`, `DemoServiceTest.java`

**Interfaces:**
- Produces: seed IDs `margaret`, `david`, `aisha`, `james`, `sarah`, `sydney-stroke-center`, `marrickville-clinic`; `Person.emergencyNumber` (String, optional); test helper `IncidentFlowAlertTest.stroke(String id, String personId)`.

- [ ] **Step 1: Add the test helper overload**

In `IncidentFlowAlertTest.java`, replace the existing `stroke(String id)` with:

```java
    static AlertMessage stroke(String id) {
        return stroke(id, "ba-mai");
    }

    static AlertMessage stroke(String id, String personId) {
        DemoSettings demo = new DemoSettings();
        demo.timerSeconds = 30;
        demo.noReplySeconds = 15;
        demo.clockOffsetMs = -151020000L;
        return new AlertMessage(id, personId, Scenario.STROKE, "HR_HIGH_NO_MOVEMENT", 142, 4, demo);
    }
```

- [ ] **Step 2: Write the failing tests**

`ActionsTest.java`: extend `called115IsLoggedAndCloseWorksOnce` and add a Margaret test.

```java
    @Test
    void called115IsLoggedAndCloseWorksOnce() {
        actions.apply(ID, "lan", "CALLED_115");
        assertThat(store.get(ID).timeline).filteredOn(t -> "CALLED_115".equals(t.kind))
                .extracting(t -> t.text).containsExactly("Lan called 115");

        actions.apply(ID, "console", "CLOSE");
        assertThat(store.get(ID).status).isEqualTo(Status.CLOSED);
        assertThatThrownBy(() -> actions.apply(ID, "console", "CLOSE"))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("INVALID_STATE");
    }

    @Test
    void calledEmergencyUsesThePersonsNumber() {
        flow.create(IncidentFlowAlertTest.stroke("m-1", "margaret"));
        flow.process("m-1");

        actions.apply("m-1", "david", "CALLED_115");

        assertThat(store.get("m-1").timeline).filteredOn(t -> "CALLED_115".equals(t.kind))
                .extracting(t -> t.text).containsExactly("David called 000");
    }
```

Check first that `lan` is notified in the existing `ID` incident (the current test already calls `CALLED_115` for `lan`, so it is). If the existing log text for the name differs from `Lan` (see `EscalationRules.name`), use what `name` returns for `lan`.

`HandoffTest.java`: add a Margaret test. Routes cannot route across continents, so the mock returns empty and handoff falls back to straight-line distance.

```java
    @Test
    void margaretGoesToSydneyStrokeCenterNotTheCloserClinic() {
        when(routes.etaMinutes(any(), any())).thenReturn(Optional.empty());
        when(agent.handoff(any())).thenReturn(new HandoffResult("RECEIVED", Map.of("text", "PRE-ARRIVAL"), false));

        flow.create(IncidentFlowAlertTest.stroke("h-m", "margaret"));
        flow.process("h-m");
        CheckInInput answer = CheckInInput.ofAudio(new byte[] {1}, "audio/webm");
        flow.acceptCheckIn("h-m", answer);
        flow.processCheckIn("h-m", answer);

        assertThat(store.get("h-m").handoff.hospitalId).isEqualTo("sydney-stroke-center");
    }
```

`DemoServiceTest.java`, in `resetDeletesIncidentAndReseeds`, after the Bà Mai assertion add:

```java
        assertThat(store.person("margaret").emergencyNumber).isEqualTo("000");
        assertThat(store.hospitals()).extracting(h -> h.id).contains("sydney-stroke-center", "marrickville-clinic");
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `mvn -q -B test -Dtest=ActionsTest,HandoffTest,DemoServiceTest`
Expected: compile error `cannot find symbol ... emergencyNumber`, then (after Step 4's Person field only) `Person margaret not found`.

- [ ] **Step 4: Add the field and the seed data**

`Person.java`, after `public String addressText;`:

```java
    public String emergencyNumber;
```

`seed.json`, full new content:

```json
{
  "people": {
    "ba-mai": {
      "displayName": "Bà Mai", "age": 78, "sex": "F", "timezone": "Asia/Ho_Chi_Minh", "locale": "vi-VN",
      "dialect": "HUE", "addressText": "12 Kiệt 4, Hương Thủy, Huế (fictional)", "emergencyNumber": "115",
      "location": { "lat": 16.4012, "lng": 107.6871 },
      "accessibility": { "hearing": "LOSS" },
      "baseline": { "restingHr": 64, "nightHr": 58 },
      "circle": [
        { "memberId": "ong-hung", "relation": "brother", "role": "NEARBY", "priority": 1, "criticalAlerts": true },
        { "memberId": "lan", "relation": "daughter", "role": "DISTANT", "priority": 2, "criticalAlerts": true },
        { "memberId": "tuan", "relation": "son", "role": "DISTANT", "priority": 3, "criticalAlerts": false }
      ]
    },
    "ong-hung": { "displayName": "Ông Hùng", "timezone": "Asia/Ho_Chi_Minh", "locale": "vi-VN", "location": { "lat": 16.4105, "lng": 107.6930 } },
    "lan": { "displayName": "Lan", "timezone": "Asia/Tokyo", "locale": "vi-VN", "location": { "lat": 35.6812, "lng": 139.7671 } },
    "tuan": { "displayName": "Anh Tuấn", "timezone": "Asia/Ho_Chi_Minh", "locale": "vi-VN", "location": { "lat": 10.7769, "lng": 106.7009 } },
    "margaret": {
      "displayName": "Margaret Collins", "age": 78, "sex": "F", "timezone": "Australia/Sydney", "locale": "en-AU",
      "addressText": "14 Wilga Street, Marrickville NSW 2204 (fictional)", "emergencyNumber": "000",
      "location": { "lat": -33.9105, "lng": 151.1553 },
      "accessibility": { "hearing": "LOSS" },
      "baseline": { "restingHr": 63, "nightHr": 57 },
      "circle": [
        { "memberId": "david", "relation": "son", "role": "NEARBY", "priority": 1, "criticalAlerts": true },
        { "memberId": "aisha", "relation": "neighbour", "role": "NEARBY", "priority": 2, "criticalAlerts": true },
        { "memberId": "james", "relation": "son", "role": "DISTANT", "priority": 3, "criticalAlerts": true },
        { "memberId": "sarah", "relation": "daughter", "role": "DISTANT", "priority": 4, "criticalAlerts": false }
      ]
    },
    "david": { "displayName": "David", "timezone": "Australia/Sydney", "locale": "en-AU", "location": { "lat": -33.9090, "lng": 151.1597 } },
    "aisha": { "displayName": "Aisha", "timezone": "Australia/Sydney", "locale": "en-AU", "location": { "lat": -33.9106, "lng": 151.1556 } },
    "james": { "displayName": "James", "timezone": "Australia/Melbourne", "locale": "en-AU", "location": { "lat": -37.8136, "lng": 144.9631 } },
    "sarah": { "displayName": "Sarah", "timezone": "Australia/Brisbane", "locale": "en-AU", "location": { "lat": -27.4698, "lng": 153.0251 } }
  },
  "hospitals": {
    "stroke-center-a": { "name": "Stroke Center A (demo)", "location": { "lat": 16.4637, "lng": 107.5909 }, "strokeReady": true },
    "district-clinic-b": { "name": "District Clinic B (demo)", "location": { "lat": 16.4050, "lng": 107.6950 }, "strokeReady": false },
    "sydney-stroke-center": { "name": "Sydney Stroke Center (demo)", "location": { "lat": -33.8889, "lng": 151.1820 }, "strokeReady": true },
    "marrickville-clinic": { "name": "Marrickville Clinic (demo)", "location": { "lat": -33.9112, "lng": 151.1570 }, "strokeReady": false }
  }
}
```

- [ ] **Step 5: Use the number in the log text**

`Actions.java`, `called115`:

```java
    private long called115(String incidentId, String memberId) {
        Map<String, Person> people = store.people();
        return store.mutate(incidentId, (x, now) -> {
            x.assignment(memberId).filter(a -> a.state != AssignmentState.QUEUED)
                    .orElseThrow(() -> ApiException.invalidState(memberId + " has not been notified"));
            Person older = people.get(x.personId);
            String number = older != null && older.emergencyNumber != null ? older.emergencyNumber : "115";
            x.log(now, memberId, "CALLED_115", EscalationRules.name(people, memberId) + " called " + number);
            return true;
        }).incident().version;
    }
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `mvn -q -B test -Dtest=ActionsTest,HandoffTest,DemoServiceTest`
Expected: PASS.

Red edits (record each in checks.md, then revert):
- `calledEmergencyUsesThePersonsNumber`: in `Actions.called115` replace `" called " + number` with `" called 115"`.
- `margaretGoesToSydneyStrokeCenterNotTheCloserClinic`: in `Handoff.java:38` replace `filter(h -> !stroke || h.strokeReady)` with `filter(h -> true)`. Expect `marrickville-clinic`.
- `resetDeletesIncidentAndReseeds` (Margaret lines): remove the `"margaret"` entry from `seed.json`. Expect `Person margaret not found`.

- [ ] **Step 7: Full suite, then commit**

Run: `mvn -q -B clean test` → all green.

```bash
git add core-api/src/main/resources/data/seed.json core-api/src/main/java/com/noonealone/coreapi/model/Person.java core-api/src/main/java/com/noonealone/coreapi/flow/Actions.java core-api/src/test/java/com/noonealone/coreapi/flow/IncidentFlowAlertTest.java core-api/src/test/java/com/noonealone/coreapi/flow/ActionsTest.java core-api/src/test/java/com/noonealone/coreapi/flow/HandoffTest.java core-api/src/test/java/com/noonealone/coreapi/flow/DemoServiceTest.java
git commit -m "feat(core-api): seed Margaret in Sydney with her own emergency number"
```

---

### Task 2: Story time in the person's timezone

**Files:**
- Modify: `core-api/src/main/java/com/noonealone/coreapi/model/Scenario.java`
- Modify: `core-api/src/main/java/com/noonealone/coreapi/model/StoryClock.java`
- Modify: `core-api/src/main/java/com/noonealone/coreapi/flow/DemoService.java:53,59` (compile fix only)
- Test: `core-api/src/test/java/com/noonealone/coreapi/model/StoryClockTest.java`

**Interfaces:**
- Produces: `Scenario.storyLocal` (`LocalDateTime`), `StoryClock.storyStart(Scenario, ZoneId): Instant`, `StoryClock.offsetFor(Scenario, ZoneId, Clock): long`, constant `StoryClock.DEFAULT_ZONE` (`ZoneId.of("Asia/Ho_Chi_Minh")`). `Scenario.storyStart` and `StoryClock.offsetFor(Scenario, Clock)` are removed.

- [ ] **Step 1: Write the failing tests**

Replace `offsetMapsRecordingTimeToStoryStart` in `StoryClockTest.java` and add the Sydney tests:

```java
    private static final ZoneId HUE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final ZoneId SYDNEY = ZoneId.of("Australia/Sydney");

    @Test
    void offsetMapsRecordingTimeToStoryStart() {
        long offset = StoryClock.offsetFor(Scenario.STROKE, HUE, recording);

        assertThat(offset).isEqualTo(-151020000L);
        assertThat(StoryClock.now(offset, recording)).isEqualTo("2026-10-15T19:03:00Z");
    }

    @Test
    void baMaiKeepsTheContractInstants() {
        assertThat(StoryClock.storyStart(Scenario.STROKE, HUE)).isEqualTo(Instant.parse("2026-10-15T19:03:00Z"));
        assertThat(StoryClock.storyStart(Scenario.FALL, HUE)).isEqualTo(Instant.parse("2026-10-15T20:12:00Z"));
        assertThat(StoryClock.storyStart(Scenario.FALSE_ALARM, HUE)).isEqualTo(Instant.parse("2026-10-16T03:42:00Z"));
    }

    @Test
    void margaretsStrokeIsTwoAmSydneyTime() {
        assertThat(StoryClock.storyStart(Scenario.STROKE, SYDNEY)).isEqualTo(Instant.parse("2026-10-15T15:03:00Z"));
    }
```

Add `import java.time.ZoneId;`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `mvn -q -B test -Dtest=StoryClockTest`
Expected: compile error `cannot find symbol ... storyStart(Scenario,ZoneId)`.

- [ ] **Step 3: Implement**

`Scenario.java`:

```java
package com.noonealone.coreapi.model;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Optional;

public enum Scenario {
    STROKE("stroke", "2026-10-16T02:03:00"),
    FALL("fall", "2026-10-16T03:12:00"),
    FALSE_ALARM("false-alarm", "2026-10-16T10:42:00");

    public final String slug;
    /** Wall-clock story time in the older person's own timezone. */
    public final LocalDateTime storyLocal;

    Scenario(String slug, String storyLocal) {
        this.slug = slug;
        this.storyLocal = LocalDateTime.parse(storyLocal);
    }

    public static Optional<Scenario> fromSlug(String slug) {
        return Arrays.stream(values()).filter(s -> s.slug.equals(slug)).findFirst();
    }
}
```

`StoryClock.java`, replace `offsetFor` with:

```java
    public static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    public static Instant storyStart(Scenario scenario, ZoneId zone) {
        return scenario.storyLocal.atZone(zone).toInstant();
    }

    public static long offsetFor(Scenario scenario, ZoneId zone, Clock clock) {
        return storyStart(scenario, zone).toEpochMilli() - clock.millis();
    }
```

Add `import java.time.ZoneId;`.

`DemoService.java`, keep it compiling with Bà Mai's zone (Task 3 makes it per person):

```java
        settings.clockOffsetMs = StoryClock.offsetFor(scenario, StoryClock.DEFAULT_ZONE, clock);
```
```java
        current.startedAt = StoryClock.storyStart(scenario, StoryClock.DEFAULT_ZONE).toString();
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `mvn -q -B test -Dtest=StoryClockTest,DemoServiceTest`
Expected: PASS (`triggerRunsTheStoryInStoryTime` still sees `2026-10-15T19:03:00Z` and `-151020000`).

Red edit for `margaretsStrokeIsTwoAmSydneyTime`: in `storyStart` replace `atZone(zone)` with `atZone(DEFAULT_ZONE)`. Expect `2026-10-15T19:03:00Z`. Record, revert.

- [ ] **Step 5: Full suite, then commit**

Run: `mvn -q -B clean test` → all green.

```bash
git add core-api/src/main/java/com/noonealone/coreapi/model/Scenario.java core-api/src/main/java/com/noonealone/coreapi/model/StoryClock.java core-api/src/main/java/com/noonealone/coreapi/flow/DemoService.java core-api/src/test/java/com/noonealone/coreapi/model/StoryClockTest.java
git commit -m "feat(core-api): story time is local to the older person's timezone"
```

---

### Task 3: Demo trigger takes a personId

**Files:**
- Modify: `core-api/src/main/java/com/noonealone/coreapi/flow/DemoService.java`
- Modify: `core-api/src/main/java/com/noonealone/coreapi/model/DemoCurrent.java`
- Modify: `core-api/src/main/java/com/noonealone/coreapi/web/ApiController.java:28,46-54`
- Test: `core-api/src/test/java/com/noonealone/coreapi/flow/DemoServiceTest.java`, `core-api/src/test/java/com/noonealone/coreapi/web/ApiControllerTest.java`

**Interfaces:**
- Consumes: `StoryClock.storyStart(Scenario, ZoneId)`, `StoryClock.offsetFor(Scenario, ZoneId, Clock)`, `StoryClock.DEFAULT_ZONE` (Task 2); seed `margaret`, `david` (Task 1).
- Produces: `DemoService.trigger(Scenario scenario, String personId, int timerSeconds, int noReplySeconds): String`; `DemoCurrent.personId`; `ApiController.DemoRequest(Integer timerSeconds, Integer noReplySeconds, String personId)`.

- [ ] **Step 1: Write the failing tests**

`DemoServiceTest.java`: change every existing `demo.trigger(X, 30, 15)` to `demo.trigger(X, "ba-mai", 30, 15)`. In `triggerRunsTheStoryInStoryTime` add `assertThat(store.current().orElseThrow().personId).isEqualTo("ba-mai");`. Then add:

```java
    @Test
    void triggerForMargaretRunsInSydneyStoryTime() {
        demo.reset();
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "real", null, false));
        when(agent.checkinTurn(any())).thenReturn(new TurnResult(null, null,
                new TurnResult.Next("Margaret, are you okay?", "VOICE", null, null), false, false));

        String id = demo.trigger(Scenario.STROKE, "margaret", 30, 15);

        Incident inc = store.get(id);
        assertThat(inc.personId).isEqualTo("margaret");
        assertThat(inc.alert.at).isEqualTo("2026-10-15T15:03:00Z");
        assertThat(store.current().orElseThrow().personId).isEqualTo("margaret");
        assertThat(store.current().orElseThrow().startedAt).isEqualTo("2026-10-15T15:03:00Z");
    }

    @Test
    void unknownOrMemberPersonIsRejectedBeforeAnythingIsWritten() {
        demo.reset();

        assertThatThrownBy(() -> demo.trigger(Scenario.STROKE, "nobody", 30, 15))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("INVALID_REQUEST");
        assertThatThrownBy(() -> demo.trigger(Scenario.STROKE, "david", 30, 15))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("INVALID_REQUEST");
        assertThat(store.current()).isEmpty();
    }

    @Test
    void margaretCannotStartWhileBaMaiIsRunning() {
        demo.reset();
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "real", null, false));
        when(agent.checkinTurn(any())).thenReturn(new TurnResult(null, null,
                new TurnResult.Next("Mạ ơi?", "VOICE", null, null), false, false));
        demo.trigger(Scenario.STROKE, "ba-mai", 30, 15);

        assertThatThrownBy(() -> demo.trigger(Scenario.STROKE, "margaret", 30, 15))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("INVALID_STATE");
    }

    @Test
    void personWithoutTimezoneUsesHueTime() {
        demo.reset();
        SeedData data = seed.data();
        data.people().get("margaret").timezone = null;
        store.seed(data);
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "real", null, false));
        when(agent.checkinTurn(any())).thenReturn(new TurnResult(null, null,
                new TurnResult.Next("Margaret?", "VOICE", null, null), false, false));

        String id = demo.trigger(Scenario.STROKE, "margaret", 30, 15);

        assertThat(store.get(id).alert.at).isEqualTo("2026-10-15T19:03:00Z");
    }
```

Add `@Autowired Seed seed;` and imports `com.noonealone.coreapi.data.Seed`, `com.noonealone.coreapi.data.SeedData`. Note: `store.seed` writes with `set`, so a `null` timezone removes the field (Docs is `NON_NULL`); if `IncidentStore.seed` merges instead, delete the field another way and say so in checks.md.

`ApiControllerTest.java`: update the stub and add two tests.

```java
    @Test
    void triggerReturns202WithIncidentId() throws Exception {
        when(demo.trigger(Scenario.STROKE, "ba-mai", 30, 15)).thenReturn("alert-1-stroke");

        mvc.perform(post("/api/demo/stroke").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.incidentId").value("alert-1-stroke"));
    }

    @Test
    void triggerPassesPersonIdThrough() throws Exception {
        when(demo.trigger(Scenario.FALL, "margaret", 30, 15)).thenReturn("alert-2-fall");

        mvc.perform(post("/api/demo/fall").contentType(MediaType.APPLICATION_JSON).content("{\"personId\":\"margaret\"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.incidentId").value("alert-2-fall"));
    }

    @Test
    void timersWithoutPersonIdDefaultToBaMai() throws Exception {
        when(demo.trigger(Scenario.STROKE, "ba-mai", 10, 5)).thenReturn("alert-3-stroke");

        mvc.perform(post("/api/demo/stroke").contentType(MediaType.APPLICATION_JSON)
                .content("{\"timerSeconds\":10,\"noReplySeconds\":5}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.incidentId").value("alert-3-stroke"));
    }

    @Test
    void triggerWithNoBodyDefaultsToBaMai() throws Exception {
        when(demo.trigger(Scenario.STROKE, "ba-mai", 30, 15)).thenReturn("alert-4-stroke");

        mvc.perform(post("/api/demo/stroke"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.incidentId").value("alert-4-stroke"));
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `mvn -q -B test -Dtest=DemoServiceTest,ApiControllerTest`
Expected: compile error `method trigger ... cannot be applied to given types`.

- [ ] **Step 3: Implement**

`DemoCurrent.java`:

```java
public class DemoCurrent { public String incidentId; public String scenario; public String personId; public String startedAt; }
```

`DemoService.java`, `trigger` becomes (add imports `java.time.ZoneId`, `com.noonealone.coreapi.model.Person`):

```java
    public String trigger(Scenario scenario, String personId, int timerSeconds, int noReplySeconds) {
        Person person = store.people().get(personId);
        if (person == null || person.circle == null) {
            throw ApiException.badRequest("Unknown person " + personId);
        }
        boolean running = store.current()
                .map(c -> store.find(c.incidentId).map(i -> i.status != Status.CLOSED).orElse(true)).orElse(false);
        if (running) {
            throw ApiException.invalidState("A demo incident is still running. Close or reset it first.");
        }
        Fixture f = scenarios.get(scenario);
        ZoneId zone = person.timezone == null ? StoryClock.DEFAULT_ZONE : ZoneId.of(person.timezone);
        DemoSettings settings = new DemoSettings();
        settings.timerSeconds = timerSeconds;
        settings.noReplySeconds = noReplySeconds;
        settings.clockOffsetMs = StoryClock.offsetFor(scenario, zone, clock);
        String id = "alert-" + clock.millis() + "-" + scenario.slug;

        DemoCurrent current = new DemoCurrent();
        current.incidentId = id;
        current.scenario = scenario.name();
        current.personId = personId;
        current.startedAt = StoryClock.storyStart(scenario, zone).toString();
        store.setCurrent(current);

        publisher.publish(new AlertMessage(id, personId, scenario, f.alert().kind(), f.alert().hr(),
                f.alert().movementMin(), settings));
        return id;
    }
```

`ApiController.java`:

```java
    public record DemoRequest(Integer timerSeconds, Integer noReplySeconds, String personId) {}
```
```java
        int noReply = body != null && body.noReplySeconds() != null ? body.noReplySeconds() : 15;
        String personId = body != null && body.personId() != null ? body.personId() : "ba-mai";
        return Map.of("incidentId", demo.trigger(s, personId, timer, noReply));
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `mvn -q -B test -Dtest=DemoServiceTest,ApiControllerTest`
Expected: PASS.

Red edits (record each, revert):
- `triggerForMargaretRunsInSydneyStoryTime`: in the `publisher.publish(...)` call replace `personId` with `f.personId()`. Expect `personId` `ba-mai`.
- `unknownOrMemberPersonIsRejectedBeforeAnythingIsWritten`: replace `person == null || person.circle == null` with `person == null`. Expect no exception for `david`.
- `personWithoutTimezoneUsesHueTime`: replace `person.timezone == null ? StoryClock.DEFAULT_ZONE : ZoneId.of(person.timezone)` with `ZoneId.of(person.timezone)`. Expect `NullPointerException`.
- `margaretCannotStartWhileBaMaiIsRunning`: replace `if (running)` with `if (running && false)`. Expect no exception.
- `timersWithoutPersonIdDefaultToBaMai`: replace `"ba-mai"` default in `ApiController` with `null`. Expect the stub not to match (empty body or 500).

- [ ] **Step 5: Full suite, then commit**

Run: `mvn -q -B clean test` → all green.

```bash
git add core-api/src/main/java/com/noonealone/coreapi/flow/DemoService.java core-api/src/main/java/com/noonealone/coreapi/model/DemoCurrent.java core-api/src/main/java/com/noonealone/coreapi/web/ApiController.java core-api/src/test/java/com/noonealone/coreapi/flow/DemoServiceTest.java core-api/src/test/java/com/noonealone/coreapi/web/ApiControllerTest.java
git commit -m "feat(core-api): demo trigger picks the older person"
```

---

### Task 4: Contract v1.4

**Files:**
- Modify: `docs/contract.md`

No test: docs only. The reviewer checks each change below against the code from Tasks 1 to 3.

- [ ] **Step 1: Edit the contract**

1. Header: `Version 1.4, 15/10.`
2. 1. Conventions, IDs bullet: seed IDs become `ba-mai`, `ong-hung`, `margaret`, `david`.
3. Story clock: replace the first sentence and the table.
   - Sentence: "Each scenario has a local story time. `storyStart` is that time in the older person's `timezone` (Bà Mai: `Asia/Ho_Chi_Minh`, Margaret: `Australia/Sydney`). A person without `timezone` uses `Asia/Ho_Chi_Minh`."
   - Table columns: Scenario | Local story time | Bà Mai storyStart (UTC) | Margaret storyStart (UTC). Rows: STROKE 16/10 02:03, `2026-10-15T19:03:00Z`, `2026-10-15T15:03:00Z`; FALL 16/10 03:12, `2026-10-15T20:12:00Z`, `2026-10-15T16:12:00Z`; FALSE_ALARM 16/10 10:42, `2026-10-16T03:42:00Z`, `2026-10-15T23:42:00Z`.
4. 2.1 people: add `"emergencyNumber": "115"` to the example, and a table row: `emergencyNumber` | string | person only | Number shown and logged for `CALLED_115`; Bà Mai `115`, Margaret `000`. Add a paragraph: Margaret Collins, 78, Marrickville, `en-AU`, no `dialect`; circle `david` (NEARBY 1), `aisha` (NEARBY 2), `james` (DISTANT 3), `sarah` (DISTANT 4, no critical alerts). Members list adds `david`, `aisha`, `james`, `sarah`.
5. 2.2 hospitals: Sydney has the same pair, `sydney-stroke-center` (stroke-ready) and `marrickville-clinic` (closer, not stroke-ready).
6. 2.6 demo/current: example becomes `{ "incidentId": "alert-123", "scenario": "STROKE", "personId": "ba-mai", "startedAt": "2026-10-15T19:03:00Z" }`.
7. 4.1 `POST /api/demo/{scenario}`: body example adds `"personId": "margaret"`; text: "`personId` is optional and defaults to `ba-mai`. A `personId` that is not an older person in the seed returns `400 INVALID_REQUEST`."
8. Action rules row `CALLED_115`: "Timeline `CALLED_115` with text `{member} called {emergencyNumber}`. No state change".

Docs rules: short plain sentences, no em-dashes.

- [ ] **Step 2: Check and commit**

Run: `grep -n "1.4\|margaret\|emergencyNumber\|personId" docs/contract.md` and confirm each of the 8 edits appears.

```bash
git add docs/contract.md
git commit -m "docs(contract): v1.4 second demo character"
```

---

## After the last task

- Controller reads the final diff against the spec and the Review Focus list.
- Ship needs Dũng's approval: push, PR into `dev`, CI green, merge. Deploy then redeploys core-api, and `POST /api/demo/reset` reseeds Firestore with Margaret.
- Messages for Hải (web `personId`, `demo/current.personId`), Tài (English when `locale` is `en-AU`) and Minh (FHIR and forecast for `margaret`).
