package com.noonealone.coreapi.flow;

import com.noonealone.coreapi.model.DemoCurrent;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;

import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.agent.TurnResult;
import com.noonealone.coreapi.agent.VerifyResult;
import com.noonealone.coreapi.data.Seed;
import com.noonealone.coreapi.data.SeedData;
import com.noonealone.coreapi.gcp.EscalationTimers;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Scenario;
import com.noonealone.coreapi.model.Status;
import com.noonealone.coreapi.store.IncidentStore;
import com.noonealone.coreapi.support.FirestoreTestBase;
import com.noonealone.coreapi.support.FixedClockConfig;
import com.noonealone.coreapi.support.SyncExecutorConfig;
import com.noonealone.coreapi.web.ApiException;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import({FixedClockConfig.class, SyncExecutorConfig.class})
class DemoServiceTest extends FirestoreTestBase {

    @Autowired DemoService demo;
    @Autowired AlertIntake intake;
    @Autowired IncidentStore store;
    @Autowired Seed seed;
    @MockBean RespondAgentClient agent;
    @MockBean EscalationTimers tasks;

    @Test
    void triggerRunsTheStoryInStoryTime() {
        demo.reset();
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "real", "2026-10-15T18:55:00Z", false));
        when(agent.checkinTurn(any())).thenReturn(new TurnResult(null, null,
                new TurnResult.Next("Mạ ơi?", "VOICE", null, null), false, false));

        String id = demo.trigger(Scenario.STROKE, "ba-mai", 30, 15);

        Incident inc = store.get(id);
        assertThat(id).startsWith("alert-").endsWith("-stroke");
        assertThat(inc.alert.at).isEqualTo("2026-10-15T19:03:00Z");
        assertThat(inc.demo.clockOffsetMs).isEqualTo(-151020000L);
        assertThat(inc.status).isEqualTo(Status.CHECKING_IN);
        assertThat(store.current().orElseThrow().incidentId).isEqualTo(id);
        assertThat(store.current().orElseThrow().personId).isEqualTo("ba-mai");
    }

    @Test
    void secondTriggerWhileRunningIsRejected() {
        demo.reset();
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "real", null, false));
        when(agent.checkinTurn(any())).thenReturn(new TurnResult(null, null,
                new TurnResult.Next("Mạ ơi?", "VOICE", null, null), false, false));
        demo.trigger(Scenario.STROKE, "ba-mai", 30, 15);

        assertThatThrownBy(() -> demo.trigger(Scenario.FALL, "ba-mai", 30, 15)).isInstanceOf(ApiException.class);
    }

    @Test
    void resetDeletesIncidentAndReseeds() {
        demo.reset();
        when(agent.verify(any())).thenReturn(new VerifyResult(false, "stairs", null, false));
        String id = demo.trigger(Scenario.FALSE_ALARM, "ba-mai", 30, 15);

        demo.reset();

        assertThat(store.find(id)).isEmpty();
        assertThat(store.current()).isEmpty();
        assertThat(store.person("ba-mai").displayName).isEqualTo("Bà Mai");
        assertThat(store.person("margaret").emergencyNumber).isEqualTo("000");
        assertThat(store.hospitals()).extracting(h -> h.id).contains("sydney-stroke-center", "marrickville-clinic");
    }

    @Test
    void redeliveredAlertIsProcessedOnce() {
        demo.reset();
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "real", null, false));
        when(agent.checkinTurn(any())).thenReturn(new TurnResult(null, null,
                new TurnResult.Next("Mạ ơi?", "VOICE", null, null), false, false));
        AlertMessage msg = IncidentFlowAlertTest.stroke("alert-redelivered");

        intake.receive(msg);
        intake.receive(msg);

        verify(agent, times(1)).verify(any());
        assertThat(store.get("alert-redelivered").checkIn.turns).filteredOn(t -> "AGENT".equals(t.by)).hasSize(1);
    }

    @Test
    void triggerWhileCurrentIncidentNotCreatedYetIsRejected() {
        demo.reset();
        DemoCurrent c = new DemoCurrent();
        c.incidentId = "alert-not-yet-pushed";
        store.setCurrent(c);

        assertThatThrownBy(() -> demo.trigger(Scenario.FALL, "ba-mai", 30, 15)).isInstanceOf(ApiException.class)
                .hasMessageContaining("still running");
    }

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
    void alertOverridesReplaceFixtureReadings() {
        demo.reset();
        when(agent.verify(any())).thenReturn(new VerifyResult(false, "resting", null, false));

        String id = demo.trigger(Scenario.STROKE, "margaret", 30, 15, 57, 45);

        Incident inc = store.get(id);
        assertThat(inc.alert.hr).isEqualTo(57);
        assertThat(inc.alert.movementMin).isEqualTo(45);
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
}
