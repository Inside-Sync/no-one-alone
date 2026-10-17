package com.noonealone.coreapi.flow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;

import com.noonealone.coreapi.agent.AgentException;
import com.noonealone.coreapi.agent.HandoffResult;
import com.noonealone.coreapi.agent.PlanResult;
import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.agent.TriageResult;
import com.noonealone.coreapi.agent.TurnResult;
import com.noonealone.coreapi.agent.VerifyResult;
import com.noonealone.coreapi.data.Seed;
import com.noonealone.coreapi.data.SeedData;
import com.noonealone.coreapi.gcp.EscalationTimers;
import com.noonealone.coreapi.gcp.RoutesClient;
import com.noonealone.coreapi.model.AssignmentState;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Level;
import com.noonealone.coreapi.model.Role;
import com.noonealone.coreapi.model.Status;
import com.noonealone.coreapi.store.IncidentStore;
import com.noonealone.coreapi.support.FirestoreTestBase;
import com.noonealone.coreapi.support.FixedClockConfig;
import com.noonealone.coreapi.support.SyncExecutorConfig;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import({FixedClockConfig.class, SyncExecutorConfig.class})
class EscalationTest extends FirestoreTestBase {

    @Autowired IncidentFlow flow;
    @Autowired Escalation escalation;
    @Autowired IncidentStore store;
    @Autowired Seed seed;
    @MockBean RespondAgentClient agent;
    @MockBean EscalationTimers tasks;
    @MockBean RoutesClient routes;

    static final String TASK = "projects/p/locations/r/queues/escalation/tasks/e-1-ong-hung-1";

    PlanResult plan() {
        return new PlanResult(List.of(new PlanResult.Message("ong-hung", "Chị Mai có thể đang bị đột quỵ."),
                new PlanResult.Message("lan", "Mẹ có dấu hiệu đột quỵ.")), "Địa chỉ 12 Kiệt 4",
                new PlanResult.Instruction(List.of("SIT_STILL"), "Mạ ngồi yên.", null, null), false);
    }

    void runToTriage(SeedData data, String id) {
        store.seed(data);
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "real", "2026-10-15T18:55:00Z", false));
        when(agent.checkinTurn(any())).thenReturn(new TurnResult(null, null, null, true, false));
        when(agent.triage(any())).thenReturn(new TriageResult(Level.COME_NOW, List.of("no answer"), false));
        when(routes.etaMinutes(any(), any())).thenReturn(Optional.of(6));
        when(tasks.schedule(anyString(), anyString(), anyInt(), anyInt())).thenReturn(TASK);
        flow.create(IncidentFlowAlertTest.stroke(id));
        flow.process(id);
    }

    @Test
    void startNotifiesDistantAtOnceAndFirstNearbyWithTimer() {
        when(agent.plan(any())).thenReturn(plan());
        runToTriage(seed.data(), "e-1");

        Incident inc = store.get("e-1");
        assertThat(inc.status).isEqualTo(Status.ESCALATING);
        assertThat(inc.assignments).extracting(a -> a.memberId).containsExactly("ong-hung", "lan");
        var hung = inc.assignment("ong-hung").orElseThrow();
        assertThat(hung.state).isEqualTo(AssignmentState.NOTIFIED);
        assertThat(hung.actions).containsExactly("ACCEPT", "DECLINE");
        assertThat(hung.etaMin).isEqualTo(6);
        assertThat(hung.deadlineAt).isEqualTo("2026-10-15T19:03:30Z");
        var lan = inc.assignment("lan").orElseThrow();
        assertThat(lan.state).isEqualTo(AssignmentState.NOTIFIED);
        assertThat(lan.actions).containsExactly("CALL_PERSON", "CALLED_115");
        assertThat(inc.escalationTaskName).isEqualTo(TASK);
        assertThat(inc.callScript).isEqualTo("Địa chỉ 12 Kiệt 4");
        assertThat(inc.personInstruction.text).isEqualTo("Mạ ngồi yên.");
        verify(tasks).schedule("e-1", "ong-hung", 1, 30);
        assertThat(inc.timeline).filteredOn(t -> "NOTIFIED".equals(t.kind)).extracting(t -> t.text)
                .anyMatch(s -> s.startsWith("Calling ") && s.endsWith(": Chị Mai có thể đang bị đột quỵ."));
    }

    @Test
    void personWithoutDialectSendsNoDialectKeyToPlan() {
        when(agent.plan(any())).thenReturn(plan());
        store.seed(seed.data());
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "real", "2026-10-15T18:55:00Z", false));
        when(agent.checkinTurn(any())).thenReturn(new TurnResult(null, null, null, true, false));
        when(agent.triage(any())).thenReturn(new TriageResult(Level.COME_NOW, List.of("no answer"), false));
        when(tasks.schedule(anyString(), anyString(), anyInt(), anyInt())).thenReturn(TASK);
        flow.create(IncidentFlowAlertTest.stroke("e-m", "margaret"));
        flow.process("e-m");

        verify(agent).plan(argThat(b -> !((Map<?, ?>) b.get("person")).containsKey("dialect")));
    }

    @Test
    void planUsesThePersonsOwnMedsOverTheScenario() {
        when(agent.plan(any())).thenReturn(plan());
        store.seed(seed.data());
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "real", "2026-10-15T18:55:00Z", false));
        when(agent.checkinTurn(any())).thenReturn(new TurnResult(null, null, null, true, false));
        when(agent.triage(any())).thenReturn(new TriageResult(Level.COME_NOW, List.of("no answer"), false));
        when(tasks.schedule(anyString(), anyString(), anyInt(), anyInt())).thenReturn(TASK);
        flow.create(IncidentFlowAlertTest.stroke("e-meds", "margaret"));
        flow.process("e-meds");

        verify(agent).plan(argThat(b -> ((Map<?, ?>) b.get("context")).get("meds").equals(
                List.of("amlodipine 5 mg each evening", "aspirin 100 mg each morning", "atorvastatin 20 mg at night"))));
    }

    @Autowired Actions actions;

    static final List<String> CALL_KINDS = List.of("ALERTED", "NOTIFIED", "EXPIRED", "ACCEPTED", "NO_NEARBY", "CALLED_115");

    void runMargaretEmergency(String id) {
        runMargaretEmergency(id, seed.data());
    }

    void runMargaretEmergency(String id, SeedData data) {
        store.seed(data);
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "real", "2026-10-15T18:55:00Z", false));
        when(agent.checkinTurn(any())).thenReturn(new TurnResult(null, null, null, true, false));
        when(agent.triage(any())).thenReturn(new TriageResult(Level.EMERGENCY, List.of("weakness"), false));
        when(agent.plan(any())).thenReturn(new PlanResult(List.of(
                new PlanResult.Message("james", "Margaret may be having a stroke. Her speech is slurred."),
                new PlanResult.Message("david", "Margaret may be having a stroke. You are 6 min away. Use the spare key if needed."),
                new PlanResult.Message("sarah", "Margaret may be having a stroke.")), "186 Marrickville Road", null, false));
        when(agent.handoff(any())).thenReturn(new HandoffResult("RECEIVED", Map.of("text", "P"), false));
        when(routes.etaMinutes(any(), any())).thenReturn(Optional.of(6));
        when(tasks.schedule(anyString(), anyString(), anyInt(), anyInt())).thenAnswer(inv -> "task-" + inv.getArgument(1));
        flow.create(IncidentFlowAlertTest.stroke(id, "margaret"));
        flow.process(id);
    }

    List<String> callTexts(String id) {
        return store.get(id).timeline.stream().filter(t -> CALL_KINDS.contains(t.kind)).map(t -> t.text).toList();
    }

    @Test
    void margaretPlanUsesTheScriptLastSeenWellTime() {
        runMargaretEmergency("m-lkw");

        verify(agent).plan(argThat(b -> java.time.Instant.parse(String.valueOf(((Map<?, ?>) b.get("context")).get("lastKnownWellAt")))
                .atZone(java.time.ZoneId.of("Australia/Sydney")).toLocalTime().equals(java.time.LocalTime.of(1, 30))));
    }

    @Test
    void margaretEmergencyCallsJamesThenDavidAndDavidAcceptCalls000() {
        runMargaretEmergency("m-e1");

        var james = store.get("m-e1").assignment("james").orElseThrow();
        assertThat(james.state).isEqualTo(AssignmentState.NOTIFIED);
        assertThat(james.actions).containsExactly("CALL_PERSON", "CALLED_115");
        verify(tasks).schedule("m-e1", "james", 1, 30);

        actions.timeout("m-e1", "james", 1);
        actions.apply("m-e1", "david", "ACCEPT");

        assertThat(callTexts("m-e1")).containsExactly(
                "Alert sent to James, Sarah and David: Margaret may be having a stroke. Noa is calling for help now.",
                "Calling James: Margaret may be having a stroke. Her speech is slurred.",
                "James did not answer in 30 s · voicemail and text sent",
                "Calling David: Margaret may be having a stroke. You are 6 min away. Use the spare key if needed.",
                "David accepted",
                "Calling 000 automatically with the call script (demo call)");
    }

    @Test
    void margaretWithNoAcceptCallsJamesDavidThen000AndNeverAisha() {
        runMargaretEmergency("m-e2");

        actions.timeout("m-e2", "james", 1);
        actions.timeout("m-e2", "david", 1);

        assertThat(callTexts("m-e2")).containsExactly(
                "Alert sent to James, Sarah and David: Margaret may be having a stroke. Noa is calling for help now.",
                "Calling James: Margaret may be having a stroke. Her speech is slurred.",
                "James did not answer in 30 s · voicemail and text sent",
                "Calling David: Margaret may be having a stroke. You are 6 min away. Use the spare key if needed.",
                "David did not answer in 30 s",
                "No one nearby accepted",
                "Calling 000 automatically with the call script (demo call)");
        assertThat(store.get("m-e2").assignment("aisha")).isEmpty();
        verify(tasks, never()).schedule(anyString(), eq("aisha"), anyInt(), anyInt());
    }

    @Test
    void lateAcceptAfterNoNearbyDoesNotCall000Twice() {
        runMargaretEmergency("m-e3");

        actions.timeout("m-e3", "james", 1);
        actions.timeout("m-e3", "david", 1);
        actions.apply("m-e3", "david", "ACCEPT");

        assertThat(store.get("m-e3").timeline)
                .filteredOn(t -> "CALLED_115".equals(t.kind) && "SYSTEM".equals(t.actor)).hasSize(1);
    }

    String text(String id, String kind) {
        return store.get(id).timeline.stream().filter(t -> kind.equals(t.kind)).map(t -> t.text).findFirst().orElseThrow();
    }

    @Test
    void nobodyNearbyAtStartHandsOffAfterThe000Call() {
        SeedData data = seed.data();
        data.people().get("margaret").circle.removeIf(c -> c.role == Role.NEARBY);
        runMargaretEmergency("m-h1", data);

        assertThat(store.get("m-h1").timeline).extracting(t -> t.kind)
                .containsSubsequence("CALLED_115", "HANDOFF_SENT", "HANDOFF_RECEIVED", "FAMILY_UPDATE");
    }

    @Test
    void davidAcceptHandsOffAndTellsTheFamilyHeIsComing() {
        runMargaretEmergency("m-h2");

        actions.timeout("m-h2", "james", 1);
        actions.apply("m-h2", "david", "ACCEPT");

        assertThat(store.get("m-h2").timeline).extracting(t -> t.kind).containsSubsequence("CALLED_115", "HANDOFF_SENT");
        assertThat(text("m-h2", "FAMILY_UPDATE")).contains("David is on his way.");
    }

    @Test
    void nobodyAcceptsMeansNoaStaysWithHer() {
        runMargaretEmergency("m-h3");

        actions.timeout("m-h3", "james", 1);
        actions.timeout("m-h3", "david", 1);

        assertThat(text("m-h3", "FAMILY_UPDATE")).isEqualTo("An ambulance is on its way to Margaret (about 12 minutes). "
                + "The stroke team at Camperdown Stroke Centre has her details. I'm staying with her.");
    }

    @Test
    void handoffTaskOnClosedIncidentDoesNothing() {
        runMargaretEmergency("m-h4");
        actions.apply("m-h4", "console", "CLOSE");

        actions.timeout("m-h4", "handoff", 1);

        assertThat(store.get("m-h4").handoff).isNull();
        verify(agent, never()).handoff(any());
    }

    @Test
    void noNearbyMemberMeansDistantGetsCallNearbyAnd115() {
        when(agent.plan(any())).thenReturn(plan());
        SeedData data = seed.data();
        data.people().get("ba-mai").circle.removeIf(c -> c.role == Role.NEARBY);
        runToTriage(data, "e-2");

        Incident inc = store.get("e-2");
        assertThat(inc.timeline).extracting(t -> t.kind).containsSubsequence("NO_NEARBY", "CALLED_115");
        assertThat(inc.assignment("lan").orElseThrow().actions).containsExactly("CALL_NEARBY");
        verify(tasks, times(0)).schedule(anyString(), anyString(), anyInt(), anyInt());
    }

    @Test
    void planFailureUsesFallbackMessages() {
        when(agent.plan(any())).thenThrow(new AgentException("down", null));
        runToTriage(seed.data(), "e-3");

        Incident inc = store.get("e-3");
        assertThat(inc.status).isEqualTo(Status.ESCALATING);
        assertThat(inc.assignment("ong-hung").orElseThrow().message).contains("Bà Mai");
        assertThat(inc.timeline).extracting(t -> t.kind).contains("AGENT_FALLBACK");
    }

    @Test
    void startTwiceDoesNotDuplicateAssignments() {
        when(agent.plan(any())).thenReturn(plan());
        runToTriage(seed.data(), "e-4");

        escalation.start("e-4");

        assertThat(store.get("e-4").assignments).hasSize(2);
        verify(tasks, times(1)).schedule(eq("e-4"), anyString(), anyInt(), anyInt());
    }

    @Test
    void secondNearbyIsQueued() {
        when(agent.plan(any())).thenReturn(plan());
        SeedData data = seed.data();
        var neighbour = new com.noonealone.coreapi.model.CircleEntry();
        neighbour.memberId = "tuan";
        neighbour.relation = "neighbour";
        neighbour.role = Role.NEARBY;
        neighbour.priority = 5;
        neighbour.criticalAlerts = true;
        data.people().get("ba-mai").circle.add(neighbour);
        runToTriage(data, "e-5");

        Incident inc = store.get("e-5");
        assertThat(inc.assignments).extracting(a -> a.memberId).containsExactly("ong-hung", "lan", "tuan");
        assertThat(inc.assignment("tuan").orElseThrow().state).isEqualTo(AssignmentState.QUEUED);
        verify(tasks, times(1)).schedule(eq("e-5"), anyString(), anyInt(), anyInt());
    }

    @Test
    void timerFailureStillEscalatesAndNotifiesEveryone() {
        when(agent.plan(any())).thenReturn(plan());
        store.seed(seed.data());
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "real", "2026-10-15T18:55:00Z", false));
        when(agent.checkinTurn(any())).thenReturn(new TurnResult(null, null, null, true, false));
        when(agent.triage(any())).thenReturn(new TriageResult(Level.COME_NOW, List.of("no answer"), false));
        when(tasks.schedule(anyString(), anyString(), anyInt(), anyInt())).thenThrow(new RuntimeException("tasks down"));
        flow.create(IncidentFlowAlertTest.stroke("e-6"));
        flow.process("e-6");

        Incident inc = store.get("e-6");
        assertThat(inc.status).isEqualTo(Status.ESCALATING);
        assertThat(inc.assignment("lan").orElseThrow().state).isEqualTo(AssignmentState.NOTIFIED);
        assertThat(inc.assignment("ong-hung").orElseThrow().state).isEqualTo(AssignmentState.NOTIFIED);
        assertThat(inc.escalationTaskName).isNull();
    }

    @Test
    void handoffSkippedWhenIncidentClosedDuringPlan() {
        store.seed(seed.data());
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "real", "2026-10-15T18:55:00Z", false));
        when(agent.checkinTurn(any())).thenReturn(new TurnResult(null, null, null, true, false));
        when(agent.triage(any())).thenReturn(new TriageResult(Level.EMERGENCY, List.of("slurred"), false));
        when(routes.etaMinutes(any(), any())).thenReturn(Optional.of(6));
        when(agent.plan(any())).thenAnswer(inv -> {
            store.mutate("e-6", (x, now) -> {
                x.status = Status.CLOSED;
                return true;
            });
            return plan();
        });
        flow.create(IncidentFlowAlertTest.stroke("e-6"));
        flow.process("e-6");

        assertThat(store.get("e-6").status).isEqualTo(Status.CLOSED);
        verify(agent, never()).handoff(any());
    }
}
