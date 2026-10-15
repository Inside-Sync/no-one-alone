package com.noonealone.coreapi.flow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;

import com.noonealone.coreapi.agent.AgentException;
import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.agent.TriageResult;
import com.noonealone.coreapi.agent.TurnResult;
import com.noonealone.coreapi.agent.VerifyResult;
import com.noonealone.coreapi.data.Seed;
import com.noonealone.coreapi.data.SeedData;
import com.noonealone.coreapi.gcp.RoutesClient;
import com.noonealone.coreapi.gcp.EscalationTimers;
import com.noonealone.coreapi.model.AssignmentState;
import com.noonealone.coreapi.model.CircleEntry;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Level;
import com.noonealone.coreapi.model.Role;
import com.noonealone.coreapi.model.Status;
import com.noonealone.coreapi.store.IncidentStore;
import com.noonealone.coreapi.support.FirestoreTestBase;
import com.noonealone.coreapi.support.FixedClockConfig;
import com.noonealone.coreapi.support.SyncExecutorConfig;
import com.noonealone.coreapi.web.ApiException;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import({FixedClockConfig.class, SyncExecutorConfig.class})
class ActionsTest extends FirestoreTestBase {

    @Autowired IncidentFlow flow;
    @Autowired Actions actions;
    @Autowired IncidentStore store;
    @Autowired Seed seed;
    @MockBean RespondAgentClient agent;
    @MockBean EscalationTimers tasks;
    @MockBean RoutesClient routes;

    static final String ID = "x-1";

    @BeforeEach
    void escalate() {
        SeedData data = seed.data();
        CircleEntry neighbour = new CircleEntry();
        neighbour.memberId = "tuan";
        neighbour.relation = "neighbour";
        neighbour.role = Role.NEARBY;
        neighbour.priority = 5;
        neighbour.criticalAlerts = true;
        data.people().get("ba-mai").circle.add(neighbour);
        store.seed(data);
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "real", "2026-10-15T18:55:00Z", false));
        when(agent.checkinTurn(any())).thenReturn(new TurnResult(null, null, null, true, false));
        when(agent.triage(any())).thenReturn(new TriageResult(Level.COME_NOW, List.of("no answer"), false));
        when(agent.plan(any())).thenThrow(new AgentException("fallback plan", null));
        when(routes.etaMinutes(any(), any())).thenReturn(Optional.empty());
        when(tasks.schedule(anyString(), anyString(), anyInt(), anyInt()))
                .thenAnswer(inv -> "task-" + inv.getArgument(1));
        when(tasks.taskName(anyString(), anyString(), anyInt())).thenAnswer(inv -> "task-" + inv.getArgument(1));
        flow.create(IncidentFlowAlertTest.stroke(ID));
        flow.process(ID);
    }

    @Test
    void acceptMakesOwnerAndDeletesTimer() {
        actions.apply(ID, "ong-hung", "ACCEPT");

        Incident inc = store.get(ID);
        assertThat(inc.ownerId).isEqualTo("ong-hung");
        assertThat(inc.assignment("ong-hung").orElseThrow().state).isEqualTo(AssignmentState.ACCEPTED);
        verify(tasks).deleteQuietly("task-ong-hung");
    }

    @Test
    void acceptTwiceBySameMemberIsANoOp() {
        long v1 = actions.apply(ID, "ong-hung", "ACCEPT");
        long v2 = actions.apply(ID, "ong-hung", "ACCEPT");

        assertThat(v2).isEqualTo(v1);
    }

    @Test
    void concurrentAcceptHasExactlyOneOwner() throws Exception {
        actions.timeout(ID, "ong-hung", 1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        List<Callable<String>> calls = new ArrayList<>();
        for (String member : List.of("ong-hung", "tuan")) {
            calls.add(() -> {
                try {
                    actions.apply(ID, member, "ACCEPT");
                    return "OK";
                } catch (ApiException e) {
                    return e.code();
                }
            });
        }
        List<String> results = new ArrayList<>();
        for (Future<String> f : pool.invokeAll(calls)) {
            results.add(f.get());
        }
        pool.shutdown();

        assertThat(results).containsExactlyInAnyOrder("OK", "ALREADY_OWNED");
        assertThat(store.get(ID).ownerId).isIn("ong-hung", "tuan");
    }

    @Test
    void timeoutAfterAcceptChangesNothing() {
        actions.apply(ID, "ong-hung", "ACCEPT");
        long before = store.get(ID).version;

        actions.timeout(ID, "ong-hung", 1);

        assertThat(store.get(ID).version).isEqualTo(before);
        verify(tasks, never()).schedule(ID, "tuan", 1, 30);
    }

    @Test
    void lateAcceptStopsTheNextTimer() {
        actions.timeout(ID, "ong-hung", 1);
        actions.apply(ID, "ong-hung", "ACCEPT");
        long before = store.get(ID).version;

        actions.timeout(ID, "tuan", 1);

        Incident inc = store.get(ID);
        assertThat(inc.assignment("tuan").orElseThrow().state).isEqualTo(AssignmentState.NOTIFIED);
        assertThat(inc.timeline).extracting(t -> t.kind).doesNotContain("NO_NEARBY");
        assertThat(inc.version).isEqualTo(before);
    }

    @Test
    void timeoutExpiresAndNotifiesNext() {
        actions.timeout(ID, "ong-hung", 1);

        Incident inc = store.get(ID);
        assertThat(inc.assignment("ong-hung").orElseThrow().state).isEqualTo(AssignmentState.EXPIRED);
        assertThat(inc.assignment("tuan").orElseThrow().state).isEqualTo(AssignmentState.NOTIFIED);
        assertThat(inc.escalationTaskName).isEqualTo("task-tuan");
        verify(tasks).schedule(ID, "tuan", 1, 30);
    }

    @Test
    void lastTimeoutAppliesNoNearbyRule() {
        actions.timeout(ID, "ong-hung", 1);
        actions.timeout(ID, "tuan", 1);

        Incident inc = store.get(ID);
        assertThat(inc.timeline).extracting(t -> t.kind).contains("NO_NEARBY");
        assertThat(inc.assignment("lan").orElseThrow().actions).containsExactly("CALL_NEARBY", "CALLED_115");
    }

    @Test
    void declineNotifiesNextAndDeletesOwnTimer() {
        actions.apply(ID, "ong-hung", "DECLINE");

        Incident inc = store.get(ID);
        assertThat(inc.assignment("ong-hung").orElseThrow().state).isEqualTo(AssignmentState.DECLINED);
        assertThat(inc.assignment("tuan").orElseThrow().state).isEqualTo(AssignmentState.NOTIFIED);
        var order = inOrder(tasks);
        order.verify(tasks).schedule(ID, "tuan", 1, 30);
        order.verify(tasks).deleteQuietly("task-ong-hung");
    }

    @Test
    void ineligibleDeclineIs409AndSchedulesNothing() {
        assertThatThrownBy(() -> actions.apply(ID, "tuan", "DECLINE"))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("INVALID_STATE");
        assertThatThrownBy(() -> actions.apply(ID, "lan", "DECLINE"))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("INVALID_STATE");

        verify(tasks, times(1)).schedule(anyString(), anyString(), anyInt(), anyInt());
    }

    @Test
    void onlyTheOwnerCanArrive() {
        actions.apply(ID, "ong-hung", "ACCEPT");

        assertThatThrownBy(() -> actions.apply(ID, "lan", "ARRIVED"))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("INVALID_STATE");

        actions.apply(ID, "ong-hung", "ARRIVED");
        Incident inc = store.get(ID);
        assertThat(inc.status).isEqualTo(Status.ON_SCENE);
        assertThat(inc.assignment("ong-hung").orElseThrow().arrivedAt).isNotNull();
    }

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

    @Test
    void queuedMemberCannotAcceptAndUnknownActionIsBadRequest() {
        assertThatThrownBy(() -> actions.apply(ID, "tuan", "ACCEPT"))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("INVALID_STATE");
        assertThatThrownBy(() -> actions.apply(ID, "ong-hung", "DANCE"))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("INVALID_REQUEST");
    }

    @Test
    void declineAfterLateAcceptDoesNotEscalate() {
        actions.timeout(ID, "ong-hung", 1);
        actions.apply(ID, "ong-hung", "ACCEPT");

        actions.apply(ID, "tuan", "DECLINE");

        Incident inc = store.get(ID);
        assertThat(inc.assignment("tuan").orElseThrow().state).isEqualTo(AssignmentState.DECLINED);
        assertThat(inc.timeline).extracting(t -> t.kind).doesNotContain("NO_NEARBY");
        assertThat(inc.assignment("lan").orElseThrow().actions).doesNotContain("CALL_NEARBY");
        verify(tasks, times(2)).schedule(anyString(), anyString(), anyInt(), anyInt());
    }

    @Test
    void acceptAfterArrivalIsNoOpForOwnerAndOwnedForOthers() {
        actions.apply(ID, "ong-hung", "ACCEPT");
        long v = actions.apply(ID, "ong-hung", "ARRIVED");

        assertThat(actions.apply(ID, "ong-hung", "ACCEPT")).isEqualTo(v);
        assertThatThrownBy(() -> actions.apply(ID, "tuan", "ACCEPT"))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("ALREADY_OWNED");
    }
}
