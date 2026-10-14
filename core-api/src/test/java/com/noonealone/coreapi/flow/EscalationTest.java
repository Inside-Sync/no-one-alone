package com.noonealone.coreapi.flow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;

import com.noonealone.coreapi.agent.AgentException;
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
    }

    @Test
    void noNearbyMemberMeansDistantGetsCallNearbyAnd115() {
        when(agent.plan(any())).thenReturn(plan());
        SeedData data = seed.data();
        data.people().get("ba-mai").circle.removeIf(c -> c.role == Role.NEARBY);
        runToTriage(data, "e-2");

        Incident inc = store.get("e-2");
        assertThat(inc.timeline).extracting(t -> t.kind).contains("NO_NEARBY");
        assertThat(inc.assignment("lan").orElseThrow().actions).containsExactly("CALL_NEARBY", "CALLED_115");
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
}
