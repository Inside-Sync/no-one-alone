package com.noonealone.coreapi.flow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

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
import com.noonealone.coreapi.gcp.EscalationTimers;
import com.noonealone.coreapi.gcp.RoutesClient;
import com.noonealone.coreapi.model.Assessment;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Level;
import com.noonealone.coreapi.model.Status;
import com.noonealone.coreapi.store.IncidentStore;
import com.noonealone.coreapi.support.FirestoreTestBase;
import com.noonealone.coreapi.support.FixedClockConfig;
import com.noonealone.coreapi.support.SyncExecutorConfig;
import com.noonealone.coreapi.web.ApiException;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import({FixedClockConfig.class, SyncExecutorConfig.class})
class IncidentFlowCheckInTest extends FirestoreTestBase {

    @Autowired IncidentFlow flow;
    @Autowired IncidentStore store;
    @Autowired Seed seed;
    @MockBean RespondAgentClient agent;
    @MockBean RoutesClient routes;
    @MockBean EscalationTimers tasks;

    static TurnResult ask(String text, String kind) {
        return new TurnResult(null, null, new TurnResult.Next(text, kind, null, null), false, false);
    }

    static Assessment slurred() {
        Assessment a = new Assessment();
        a.clarity = "SLURRED";
        a.coherent = true;
        return a;
    }

    @BeforeEach
    void start() {
        store.seed(seed.data());
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "real", "2026-10-15T18:55:00Z", false));
        when(agent.checkinTurn(any())).thenReturn(ask("Mạ ơi?", "VOICE"));
        when(agent.plan(any())).thenThrow(new AgentException("not under test", null));
        when(agent.handoff(any())).thenThrow(new AgentException("not under test", null));
        flow.create(IncidentFlowAlertTest.stroke("c-1"));
        flow.process("c-1");
    }

    @Test
    void yesNoAnswerUsesThePersonsLanguage() {
        flow.create(IncidentFlowAlertTest.stroke("c-m", "margaret"));
        flow.process("c-m");

        CheckInInput yes = CheckInInput.ofYesNo("YES");
        flow.acceptCheckIn("c-m", yes);
        flow.processCheckIn("c-m", yes);

        assertThat(store.get("c-m").checkIn.turns).filteredOn(t -> "PERSON".equals(t.by))
                .extracting(t -> t.text).containsExactly("Yes");
    }

    @Test
    void slurredAnswerIsStoredAndNextQuestionAsked() {
        when(agent.checkinTurn(any())).thenReturn(new TurnResult("Ừ... mạ nghe", slurred(),
                new TurnResult.Next("Mạ nhắc lại giúp con: hôm nay trời đẹp.", "VOICE", null, null), false, false));

        CheckInInput input = CheckInInput.ofAudio(new byte[] {1, 2}, "audio/webm");
        flow.acceptCheckIn("c-1", input);
        flow.processCheckIn("c-1", input);

        Incident inc = store.get("c-1");
        assertThat(inc.checkIn.turns).extracting(t -> t.by).containsExactly("AGENT", "PERSON", "AGENT");
        assertThat(inc.checkIn.turns.get(1).assessment.clarity).isEqualTo("SLURRED");
        assertThat(inc.checkIn.busy).isFalse();
        assertThat(inc.checkIn.pending.text).isEqualTo("Mạ nhắc lại giúp con: hôm nay trời đẹp.");
    }

    @Test
    void secondAnswerWhileBusyIsRejected() {
        flow.acceptCheckIn("c-1", CheckInInput.ofYesNo("YES"));

        assertThatThrownBy(() -> flow.acceptCheckIn("c-1", CheckInInput.ofYesNo("YES")))
                .isInstanceOf(ApiException.class).hasMessageContaining("not waiting");
        assertThat(store.get("c-1").checkIn.turns).hasSize(1);
    }

    @Test
    void firstNoReplySwitchesToLargeTextSecondEndsCheckIn() {
        when(agent.checkinTurn(any())).thenReturn(ask("Mạ có sao không?", "YES_NO"));
        when(agent.triage(any())).thenReturn(new TriageResult(Level.COME_NOW, List.of("no reply"), false));

        CheckInInput noReply = CheckInInput.ofNoReply();
        flow.acceptCheckIn("c-1", noReply);
        flow.processCheckIn("c-1", noReply);

        Incident afterFirst = store.get("c-1");
        assertThat(afterFirst.checkIn.mode).isEqualTo("LARGE_TEXT");
        assertThat(afterFirst.checkIn.pending.kind).isEqualTo("YES_NO");

        flow.acceptCheckIn("c-1", noReply);
        flow.processCheckIn("c-1", noReply);

        Incident inc = store.get("c-1");
        assertThat(inc.checkIn.done).isTrue();
        assertThat(inc.level).isEqualTo(Level.COME_NOW);
        verify(agent).triage(argThat(b -> Integer.valueOf(2).equals(b.get("noReplyCount"))));
    }

    @Test
    void okLevelCloses() {
        when(agent.checkinTurn(any())).thenReturn(new TurnResult("Mạ khỏe", null, null, true, false));
        when(agent.triage(any())).thenReturn(new TriageResult(Level.OK, List.of("clear speech"), false));

        CheckInInput input = CheckInInput.ofAudio(new byte[] {1}, "audio/webm");
        flow.acceptCheckIn("c-1", input);
        flow.processCheckIn("c-1", input);

        Incident inc = store.get("c-1");
        assertThat(inc.status).isEqualTo(Status.CLOSED);
        assertThat(inc.timeline).extracting(t -> t.kind).contains("TRIAGED", "CLOSED");
    }

    @Test
    void agentDownMidCheckInStillReachesALevel() {
        when(agent.checkinTurn(any())).thenReturn(new TurnResult("Ừ...", slurred(),
                new TurnResult.Next("Mạ nhắc lại?", "VOICE", null, null), false, false));
        CheckInInput first = CheckInInput.ofAudio(new byte[] {1}, "audio/webm");
        flow.acceptCheckIn("c-1", first);
        flow.processCheckIn("c-1", first);

        when(agent.checkinTurn(any())).thenThrow(new AgentException("down", null));
        when(agent.triage(any())).thenThrow(new AgentException("down", null));
        CheckInInput second = CheckInInput.ofYesNo("NO");
        flow.acceptCheckIn("c-1", second);
        flow.processCheckIn("c-1", second);

        Incident inc = store.get("c-1");
        assertThat(inc.checkIn.busy).isFalse();
        assertThat(inc.checkIn.done).isTrue();
        assertThat(inc.level).isEqualTo(Level.EMERGENCY);
        assertThat(inc.triage.fallback).isTrue();
        assertThat(inc.timeline).extracting(t -> t.kind).contains("AGENT_FALLBACK");
    }

    @Test
    void stopsAfterFourAgentTurns() {
        when(agent.triage(any())).thenReturn(new TriageResult(Level.MONITOR, List.of("unclear"), false));
        for (int i = 0; i < 4; i++) {
            CheckInInput yes = CheckInInput.ofYesNo("YES");
            flow.acceptCheckIn("c-1", yes);
            flow.processCheckIn("c-1", yes);
        }

        Incident inc = store.get("c-1");
        assertThat(inc.agentTurnCount()).isEqualTo(4);
        assertThat(inc.checkIn.done).isTrue();
        assertThat(inc.status).isEqualTo(Status.CLOSED);
    }

    @Test
    void inputMustHaveExactlyOneKind() {
        assertThatThrownBy(() -> flow.acceptCheckIn("c-1", new CheckInInput(new byte[] {1}, "audio/webm", "YES", false)))
                .isInstanceOf(ApiException.class).hasMessageContaining("exactly one");
    }

    @Test
    void unexpectedFailureClearsBusy() {
        when(agent.checkinTurn(any())).thenThrow(new IllegalStateException("boom"));
        CheckInInput input = CheckInInput.ofYesNo("YES");
        flow.acceptCheckIn("c-1", input);

        assertThatThrownBy(() -> flow.processCheckIn("c-1", input)).isInstanceOf(IllegalStateException.class);
        assertThat(store.get("c-1").checkIn.busy).isFalse();
    }

    @Test
    void inputWithoutPendingQuestionIsRejected() {
        store.mutate("c-1", (x, now) -> {
            x.checkIn.pending = null;
            return true;
        });

        assertThatThrownBy(() -> flow.acceptCheckIn("c-1", CheckInInput.ofYesNo("YES")))
                .isInstanceOf(ApiException.class).hasMessageContaining("not waiting");
        assertThat(store.get("c-1").checkIn.busy).isFalse();
    }

    @Test
    void closeDuringAgentTurnWritesNothingMore() {
        when(agent.checkinTurn(any())).thenAnswer(inv -> {
            store.mutate("c-1", (x, now) -> {
                x.status = Status.CLOSED;
                return true;
            });
            return ask("Mạ ơi?", "VOICE");
        });
        CheckInInput input = CheckInInput.ofYesNo("YES");
        flow.acceptCheckIn("c-1", input);
        flow.processCheckIn("c-1", input);

        Incident inc = store.get("c-1");
        assertThat(inc.status).isEqualTo(Status.CLOSED);
        assertThat(inc.checkIn.turns).hasSize(1);
    }

    @Test
    void malformedQuestionAudioStillAsksTheQuestion() {
        when(agent.checkinTurn(any())).thenReturn(new TurnResult(null, null,
                new TurnResult.Next("Mạ ơi?", "VOICE", "%%%", null), false, false));
        CheckInInput input = CheckInInput.ofYesNo("YES");
        flow.acceptCheckIn("c-1", input);
        flow.processCheckIn("c-1", input);

        Incident inc = store.get("c-1");
        assertThat(inc.checkIn.pending.text).isEqualTo("Mạ ơi?");
        assertThat(inc.checkIn.pending.audioPath).isNull();
    }
}
