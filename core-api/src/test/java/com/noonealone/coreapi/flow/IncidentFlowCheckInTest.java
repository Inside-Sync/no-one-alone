package com.noonealone.coreapi.flow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

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
import com.noonealone.coreapi.gcp.AudioStore;
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
import com.noonealone.coreapi.support.TestPeopleConfig;
import com.noonealone.coreapi.web.ApiException;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import({FixedClockConfig.class, SyncExecutorConfig.class, TestPeopleConfig.class})
class IncidentFlowCheckInTest extends FirestoreTestBase {

    @Autowired IncidentFlow flow;
    @Autowired IncidentStore store;
    @Autowired Seed seed;
    @MockBean RespondAgentClient agent;
    @MockBean RoutesClient routes;
    @MockBean EscalationTimers tasks;
    @MockBean AudioStore audio;

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
        when(agent.checkinTurn(any())).thenReturn(ask("Hello?", "VOICE"));
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
    void anArabicPersonAnswersYesAndNoInArabic() {
        SeedData data = seed.data();
        data.people().get("margaret").locale = "ar-AE";
        store.seed(data);
        flow.create(IncidentFlowAlertTest.stroke("c-ar", "margaret"));
        flow.process("c-ar");

        CheckInInput no = CheckInInput.ofYesNo("NO");
        flow.acceptCheckIn("c-ar", no);
        flow.processCheckIn("c-ar", no);

        assertThat(store.get("c-ar").checkIn.turns).filteredOn(t -> "PERSON".equals(t.by))
                .extracting(t -> t.text).containsExactly("لا");
    }

    @Test
    void theScriptedQuestionStepIsKeptOnTheTurnThePendingQuestionAndTheTimeline() {
        when(agent.checkinTurn(any())).thenReturn(new TurnResult("Fine", null,
                new TurnResult.Next("Please repeat after me: the sky is blue.", "VOICE", null, null, "SPEECH_CHECK"), false, false));

        CheckInInput input = CheckInInput.ofYesNo("YES");
        flow.acceptCheckIn("c-1", input);
        flow.processCheckIn("c-1", input);

        Incident inc = store.get("c-1");
        assertThat(inc.checkIn.turns).extracting(t -> t.kind).containsExactly(null, null, "SPEECH_CHECK");
        assertThat(inc.checkIn.pending.step).isEqualTo("SPEECH_CHECK");
        assertThat(inc.checkIn.pending.kind).isEqualTo("VOICE");
        assertThat(inc.timeline).filteredOn(t -> "ASKED".equals(t.kind)).extracting(t -> t.params)
                .containsExactly(null, Map.of("step", "SPEECH_CHECK"));
        assertThat(inc.timeline).filteredOn(t -> "ANSWERED".equals(t.kind)).extracting(t -> t.params)
                .containsExactly(Map.of("answer", "YES"));
    }

    @Test
    void personWithoutDialectSendsNoDialectKey() {
        flow.create(IncidentFlowAlertTest.stroke("c-m", "margaret"));
        flow.process("c-m");

        // start() already opened one check-in for the same person, so more than one call carries her.
        verify(agent, atLeastOnce()).checkinTurn(argThat(b -> !((Map<?, ?>) b.get("person")).containsKey("dialect")));
        verify(agent, never()).checkinTurn(argThat(b -> ((Map<?, ?>) b.get("person")).containsKey("dialect")));
    }

    @Test
    void slurredAnswerIsStoredAndNextQuestionAsked() {
        when(agent.checkinTurn(any())).thenReturn(new TurnResult("Mm... I hear you", slurred(),
                new TurnResult.Next("Please repeat after me: the sky is blue.", "VOICE", null, null), false, false));

        CheckInInput input = CheckInInput.ofAudio(new byte[] {1, 2}, "audio/webm");
        flow.acceptCheckIn("c-1", input);
        flow.processCheckIn("c-1", input);

        Incident inc = store.get("c-1");
        assertThat(inc.checkIn.turns).extracting(t -> t.by).containsExactly("AGENT", "PERSON", "AGENT");
        assertThat(inc.checkIn.turns.get(1).assessment.clarity).isEqualTo("SLURRED");
        assertThat(inc.checkIn.busy).isFalse();
        assertThat(inc.checkIn.pending.text).isEqualTo("Please repeat after me: the sky is blue.");
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
        when(agent.checkinTurn(any())).thenReturn(ask("Are you all right?", "YES_NO"));
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
        when(agent.checkinTurn(any())).thenReturn(new TurnResult("I am fine", null, null, true, false));
        when(agent.triage(any())).thenReturn(new TriageResult(Level.OK, List.of("clear speech"), false));

        CheckInInput input = CheckInInput.ofAudio(new byte[] {1}, "audio/webm");
        flow.acceptCheckIn("c-1", input);
        flow.processCheckIn("c-1", input);

        Incident inc = store.get("c-1");
        assertThat(inc.status).isEqualTo(Status.CLOSED);
        assertThat(inc.timeline).extracting(t -> t.kind).contains("TRIAGED", "CLOSED");
    }

    @Test
    void okLevelKeepsTheGoodbyeForHerPhone() {
        when(agent.checkinTurn(any())).thenReturn(new TurnResult("I am fine", null, null, true, false));
        when(agent.triage(any())).thenReturn(new TriageResult(Level.OK, List.of("clear speech"), false,
                new TriageResult.Closing("That is all right.", "AQI=")));
        when(audio.save(eq("c-1"), eq("closing.mp3"), any(), eq("audio/mpeg"))).thenReturn("audio/c-1/closing.mp3");

        CheckInInput input = CheckInInput.ofAudio(new byte[] {1}, "audio/webm");
        flow.acceptCheckIn("c-1", input);
        flow.processCheckIn("c-1", input);

        Incident inc = store.get("c-1");
        assertThat(inc.status).isEqualTo(Status.CLOSED);
        assertThat(inc.personInstruction.text).isEqualTo("That is all right.");
        assertThat(inc.personInstruction.audioPath).isEqualTo("audio/c-1/closing.mp3");
        assertThat(inc.personInstruction.scriptIds).isEmpty();
        verify(agent).triage(argThat(b -> "en-AE".equals(((Map<?, ?>) b.get("person")).get("locale"))));
    }

    @Test
    void goodbyeAudioFailureStillClosesWithText() {
        when(agent.checkinTurn(any())).thenReturn(new TurnResult("I am fine", null, null, true, false));
        when(agent.triage(any())).thenReturn(new TriageResult(Level.MONITOR, List.of("clear speech"), false,
                new TriageResult.Closing("That is all right.", "%%%")));

        CheckInInput input = CheckInInput.ofAudio(new byte[] {1}, "audio/webm");
        flow.acceptCheckIn("c-1", input);
        flow.processCheckIn("c-1", input);

        Incident inc = store.get("c-1");
        assertThat(inc.status).isEqualTo(Status.CLOSED);
        assertThat(inc.personInstruction.text).isEqualTo("That is all right.");
        assertThat(inc.personInstruction.audioPath).isNull();
    }

    @Test
    void emergencyIgnoresAClosing() {
        when(agent.checkinTurn(any())).thenReturn(new TurnResult("Mm...", slurred(), null, true, false));
        when(agent.triage(any())).thenReturn(new TriageResult(Level.EMERGENCY, List.of("slurred speech"), false,
                new TriageResult.Closing("bye", "AQI=")));

        CheckInInput input = CheckInInput.ofAudio(new byte[] {1}, "audio/webm");
        flow.acceptCheckIn("c-1", input);
        flow.processCheckIn("c-1", input);

        Incident inc = store.get("c-1");
        assertThat(inc.level).isEqualTo(Level.EMERGENCY);
        assertThat(inc.personInstruction == null || !"bye".equals(inc.personInstruction.text)).isTrue();
        verify(audio, never()).save(any(), eq("closing.mp3"), any(), any());
    }

    @Test
    void agentDownMidCheckInStillReachesALevel() {
        when(agent.checkinTurn(any())).thenReturn(new TurnResult("Mm...", slurred(),
                new TurnResult.Next("Please repeat?", "VOICE", null, null), false, false));
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
            return ask("Hello?", "VOICE");
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
                new TurnResult.Next("Hello?", "VOICE", "%%%", null), false, false));
        CheckInInput input = CheckInInput.ofYesNo("YES");
        flow.acceptCheckIn("c-1", input);
        flow.processCheckIn("c-1", input);

        Incident inc = store.get("c-1");
        assertThat(inc.checkIn.pending.text).isEqualTo("Hello?");
        assertThat(inc.checkIn.pending.audioPath).isNull();
    }
}
