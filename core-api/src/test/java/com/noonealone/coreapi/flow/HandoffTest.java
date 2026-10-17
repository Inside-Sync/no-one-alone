package com.noonealone.coreapi.flow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;

import com.noonealone.coreapi.agent.AgentException;
import com.noonealone.coreapi.agent.HandoffResult;
import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.agent.TriageResult;
import com.noonealone.coreapi.agent.TurnResult;
import com.noonealone.coreapi.agent.VerifyResult;
import com.noonealone.coreapi.data.Seed;
import com.noonealone.coreapi.gcp.RoutesClient;
import com.noonealone.coreapi.gcp.EscalationTimers;
import com.noonealone.coreapi.model.Assessment;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.LatLng;
import com.noonealone.coreapi.model.Level;
import com.noonealone.coreapi.store.IncidentStore;
import com.noonealone.coreapi.support.FirestoreTestBase;
import com.noonealone.coreapi.support.FixedClockConfig;
import com.noonealone.coreapi.support.SyncExecutorConfig;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import({FixedClockConfig.class, SyncExecutorConfig.class})
class HandoffTest extends FirestoreTestBase {

    @Autowired IncidentFlow flow;
    @Autowired IncidentStore store;
    @Autowired Seed seed;
    @Autowired Handoff handoff;
    @Autowired Actions actions;
    @MockBean RespondAgentClient agent;
    @MockBean EscalationTimers tasks;
    @MockBean RoutesClient routes;

    @BeforeEach
    void setUp() {
        store.seed(seed.data());
        Assessment slurred = new Assessment();
        slurred.clarity = "SLURRED";
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "real", "2026-10-15T18:55:00Z", false));
        when(agent.checkinTurn(any()))
                .thenReturn(new TurnResult(null, null, new TurnResult.Next("Mạ nhắc lại?", "VOICE", null, null), false, false))
                .thenReturn(new TurnResult("ừ... trời... đẹp", slurred, null, true, false));
        when(agent.triage(any())).thenReturn(new TriageResult(Level.EMERGENCY, List.of("slurred speech"), false));
        when(agent.plan(any())).thenThrow(new AgentException("fallback plan", null));
        when(tasks.schedule(anyString(), anyString(), anyInt(), anyInt())).thenReturn("task");
        when(routes.etaMinutes(any(), any())).thenAnswer(inv -> {
            LatLng to = inv.getArgument(1);
            return to.lat < 0 ? Optional.empty() : Optional.of(to.lat > 16.45 ? 14 : 3);
        });
    }

    void runStroke(String id) {
        flow.create(IncidentFlowAlertTest.stroke(id));
        flow.process(id);
        CheckInInput answer = CheckInInput.ofAudio(new byte[] {1}, "audio/webm");
        flow.acceptCheckIn(id, answer);
        flow.processCheckIn(id, answer);
        actions.apply(id, "ong-hung", "ACCEPT");
    }

    @Test
    void suspectedStrokeGoesToStrokeReadyHospitalEvenIfFarther() {
        when(agent.handoff(any())).thenReturn(new HandoffResult("RECEIVED", Map.of("text", "PRE-ARRIVAL"), false));

        runStroke("h-1");

        Incident inc = store.get("h-1");
        assertThat(inc.handoff.hospitalId).isEqualTo("stroke-center-a");
        assertThat(inc.handoff.etaMin).isEqualTo(14);
        assertThat(inc.handoff.status).isEqualTo("RECEIVED");
        assertThat(inc.handoff.packet).containsEntry("text", "PRE-ARRIVAL");
        assertThat(inc.timeline).extracting(t -> t.kind).contains("HANDOFF_SENT", "HANDOFF_RECEIVED");
        verify(agent).handoff(argThat(b -> "STROKE".equals(b.get("suspected"))));
    }

    @Test
    void limbWeaknessWithClearSpeechIsAlsoSuspectedStroke() {
        Assessment clear = new Assessment();
        clear.clarity = "CLEAR";
        when(agent.checkinTurn(any()))
                .thenReturn(new TurnResult(null, null, new TurnResult.Next("Can you move your arms and legs?", "VOICE", null, null), false, false))
                .thenReturn(new TurnResult("No.", clear, null, true, false));
        when(agent.triage(any())).thenReturn(new TriageResult(Level.EMERGENCY, List.of("weakness"), false));
        when(agent.handoff(any())).thenReturn(new HandoffResult("RECEIVED", Map.of("text", "PRE-ARRIVAL"), false));

        runStroke("h-w");

        assertThat(store.get("h-w").handoff.hospitalId).isEqualTo("stroke-center-a");
        verify(agent).handoff(argThat(b -> "STROKE".equals(b.get("suspected"))));
    }

    @Test
    void margaretGoesToSydneyStrokeCenterNotTheCloserClinic() {
        when(agent.handoff(any())).thenReturn(new HandoffResult("RECEIVED", Map.of("text", "PRE-ARRIVAL"), false));

        flow.create(IncidentFlowAlertTest.stroke("h-m", "margaret"));
        flow.process("h-m");
        CheckInInput answer = CheckInInput.ofAudio(new byte[] {1}, "audio/webm");
        flow.acceptCheckIn("h-m", answer);
        flow.processCheckIn("h-m", answer);
        actions.timeout("h-m", "james", 1);
        actions.timeout("h-m", "david", 1);

        Incident inc = store.get("h-m");
        assertThat(inc.handoff.hospitalId).isEqualTo("sydney-stroke-center");
        assertThat(inc.timeline).filteredOn(t -> t.kind.startsWith("HANDOFF_")).extracting(t -> t.text).containsExactly(
                "This is Noa from No One Alone. Margaret Collins, 78, female. Suspected stroke. Last seen well 05:55. "
                        + "Slurred speech found 06:03. Heart rate up to 142. On amlodipine, aspirin, atorvastatin, not on blood thinners. "
                        + "Allergy: penicillin. Next of kin: James (son).",
                "Received. Stroke call activated, CT scanner on standby.");
        verify(routes, never()).etaMinutes(any(), argThat(to -> to.lat > 0));
    }

    @Test
    void agentFailureMarksHandoffFailed() {
        when(agent.handoff(any())).thenThrow(new AgentException("down", null));

        runStroke("h-2");

        Incident inc = store.get("h-2");
        assertThat(inc.handoff.status).isEqualTo("FAILED");
        assertThat(inc.timeline).extracting(t -> t.kind).contains("HANDOFF_FAILED");
    }

    @Test
    void unexpectedClientErrorMarksHandoffFailed() {
        when(agent.handoff(any())).thenThrow(new IllegalStateException("boom"));

        runStroke("h-3");

        Incident inc = store.get("h-3");
        assertThat(inc.handoff.status).isEqualTo("FAILED");
        assertThat(inc.timeline).extracting(t -> t.kind).contains("HANDOFF_FAILED", "AGENT_FALLBACK");
        assertThat(inc.status).isEqualTo(com.noonealone.coreapi.model.Status.ESCALATING);
    }

    @Test
    void secondStartDoesNotCallAgentAgain() {
        when(agent.handoff(any())).thenReturn(new HandoffResult("RECEIVED", Map.of("text", "P"), false));

        runStroke("h-4");
        handoff.start("h-4");

        verify(agent, times(1)).handoff(any());
    }
}
