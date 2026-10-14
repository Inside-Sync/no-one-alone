package com.noonealone.coreapi.flow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;

import com.noonealone.coreapi.agent.AgentException;
import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.agent.TurnResult;
import com.noonealone.coreapi.agent.VerifyResult;
import com.noonealone.coreapi.data.Seed;
import com.noonealone.coreapi.model.DemoSettings;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Scenario;
import com.noonealone.coreapi.model.Status;
import com.noonealone.coreapi.store.IncidentStore;
import com.noonealone.coreapi.support.FirestoreTestBase;
import com.noonealone.coreapi.support.FixedClockConfig;
import com.noonealone.coreapi.support.SyncExecutorConfig;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import({FixedClockConfig.class, SyncExecutorConfig.class})
class IncidentFlowAlertTest extends FirestoreTestBase {

    @Autowired IncidentFlow flow;
    @Autowired IncidentStore store;
    @Autowired Seed seed;
    @MockBean RespondAgentClient agent;

    static AlertMessage stroke(String id) {
        DemoSettings demo = new DemoSettings();
        demo.timerSeconds = 30;
        demo.noReplySeconds = 15;
        demo.clockOffsetMs = -151020000L;
        return new AlertMessage(id, "ba-mai", Scenario.STROKE, "HR_HIGH_NO_MOVEMENT", 142, 4, demo);
    }

    @BeforeEach
    void seed() {
        store.seed(seed.data());
    }

    @Test
    void realAlertAsksTheFirstQuestion() {
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "HR 142 at night", "2026-10-15T18:55:00Z", false));
        when(agent.checkinTurn(any())).thenReturn(new TurnResult(null, null,
                new TurnResult.Next("Mạ ơi, mạ có nghe con nói không?", "VOICE", null, null), false, false));

        assertThat(flow.create(stroke("alert-1"))).isTrue();
        flow.process("alert-1");

        Incident inc = store.get("alert-1");
        assertThat(inc.status).isEqualTo(Status.CHECKING_IN);
        assertThat(inc.alert.at).isEqualTo("2026-10-15T19:03:00Z");
        assertThat(inc.lastKnownWellAt).isEqualTo("2026-10-15T18:55:00Z");
        assertThat(inc.checkIn.pending.text).isEqualTo("Mạ ơi, mạ có nghe con nói không?");
        assertThat(inc.checkIn.turns).hasSize(1);
        assertThat(inc.checkIn.busy).isFalse();
        assertThat(inc.timeline).extracting(t -> t.kind).containsExactly("ALERT", "VERIFIED", "ASKED");
    }

    @Test
    void falseAlarmClosesWithoutAsking() {
        when(agent.verify(any())).thenReturn(new VerifyResult(false, "climbing stairs", null, false));

        flow.create(stroke("alert-2"));
        flow.process("alert-2");

        Incident inc = store.get("alert-2");
        assertThat(inc.status).isEqualTo(Status.CLOSED);
        assertThat(inc.timeline).extracting(t -> t.kind).containsExactly("ALERT", "FALSE_ALARM");
        verify(agent, never()).checkinTurn(any());
    }

    @Test
    void redeliveredAlertIsNotCreatedTwice() {
        assertThat(flow.create(stroke("alert-3"))).isTrue();
        assertThat(flow.create(stroke("alert-3"))).isFalse();
    }

    @Test
    void verifyFailureIsTreatedAsRealWithFallback() {
        when(agent.verify(any())).thenThrow(new AgentException("down", null));
        when(agent.checkinTurn(any())).thenReturn(new TurnResult(null, null,
                new TurnResult.Next("Mạ ơi?", "VOICE", null, null), false, false));

        flow.create(stroke("alert-4"));
        flow.process("alert-4");

        Incident inc = store.get("alert-4");
        assertThat(inc.status).isEqualTo(Status.CHECKING_IN);
        assertThat(inc.verify.fallback).isTrue();
        assertThat(inc.timeline).extracting(t -> t.kind).contains("AGENT_FALLBACK");
        verify(agent, times(1)).checkinTurn(any());
    }
}
