package com.noonealone.coreapi.flow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Base64;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;

import com.noonealone.coreapi.agent.AgentException;
import com.noonealone.coreapi.agent.RecoveryResult;
import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.data.Seed;
import com.noonealone.coreapi.gcp.AudioStore;
import com.noonealone.coreapi.gcp.EscalationTimers;
import com.noonealone.coreapi.gcp.RoutesClient;
import com.noonealone.coreapi.model.HandoffInfo;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.RecoveryInfo.Activity;
import com.noonealone.coreapi.model.RecoveryInfo.FollowUp;
import com.noonealone.coreapi.model.RecoveryInfo.Med;
import com.noonealone.coreapi.model.Status;
import com.noonealone.coreapi.store.IncidentStore;
import com.noonealone.coreapi.support.FirestoreTestBase;
import com.noonealone.coreapi.support.FixedClockConfig;
import com.noonealone.coreapi.support.SyncExecutorConfig;
import com.noonealone.coreapi.web.ApiException;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import({FixedClockConfig.class, SyncExecutorConfig.class})
class RecoveryTest extends FirestoreTestBase {

    static final String ID = "r-1";

    @Autowired Recovery recovery;
    @Autowired IncidentStore store;
    @Autowired Seed seed;
    @MockBean RespondAgentClient agent;
    @MockBean EscalationTimers tasks;
    @MockBean RoutesClient routes;
    @MockBean AudioStore audio;

    @BeforeEach
    void setUp() {
        store.seed(seed.data());
    }

    void incident(String id, String personId, boolean withHandoff) {
        Incident inc = new Incident();
        inc.id = id;
        inc.personId = personId;
        inc.status = Status.ESCALATING;
        inc.escalationTaskName = "task-1";
        if (withHandoff) {
            inc.handoff = new HandoffInfo();
            inc.handoff.hospitalName = "Sydney Stroke Center";
            inc.handoff.status = "RECEIVED";
        }
        store.createIfAbsent(inc);
    }

    static Recovery.Plan plan(List<Med> meds, List<Activity> activities) {
        return new Recovery.Plan("Dr Nguyen", "Ischaemic stroke", meds, activities,
                List.of(new FollowUp("GP check", 7, null)), "No driving for 4 weeks.");
    }

    static Recovery.Plan plan() {
        return plan(List.of(new Med("aspirin", "100 mg", List.of("08:00"), null)), List.of());
    }

    @Test
    void agentPlanIsStoredTimelineLoggedAndIncidentClosed() {
        incident(ID, "margaret", true);
        String mp3 = Base64.getEncoder().encodeToString(new byte[] {1});
        when(agent.recovery(any())).thenReturn(new RecoveryResult("You are home.", mp3, List.of(
                new RecoveryResult.Reminder("10:00", "ACTIVITY", "Time to walk.", null),
                new RecoveryResult.Reminder("08:00", "MED", "Time for your aspirin, 100 mg.", mp3)), false));
        when(audio.save(eq(ID), eq("recovery-0.mp3"), any(), eq("audio/mpeg"))).thenReturn("audio/r-1/recovery-0.mp3");
        when(audio.save(eq(ID), eq("recovery-summary.mp3"), any(), eq("audio/mpeg"))).thenReturn("audio/r-1/recovery-summary.mp3");

        long version = recovery.discharge(ID, plan());

        Incident inc = store.get(ID);
        assertThat(version).isEqualTo(inc.version);
        assertThat(inc.status).isEqualTo(Status.CLOSED);
        assertThat(inc.recovery.createdAt).isEqualTo("2026-10-17T13:00:00Z");
        assertThat(inc.recovery.summary).isEqualTo("You are home.");
        assertThat(inc.recovery.summaryAudioPath).isEqualTo("audio/r-1/recovery-summary.mp3");
        assertThat(inc.recovery.fallback).isFalse();
        assertThat(inc.recovery.reminders).extracting(r -> r.time()).containsExactly("08:00", "10:00");
        assertThat(inc.recovery.reminders.get(0).audioPath()).isEqualTo("audio/r-1/recovery-0.mp3");
        assertThat(inc.recovery.reminders.get(1).audioPath()).isNull();
        // Sydney is UTC+11 at that instant, so the local date is already the 18th.
        assertThat(inc.recovery.followUps.get(0).date()).isEqualTo("2026-10-25");
        assertThat(inc.timeline.get(inc.timeline.size() - 1)).satisfies(t -> {
            assertThat(t.actor).isEqualTo("HOSPITAL");
            assertThat(t.kind).isEqualTo("DISCHARGED");
            assertThat(t.text).isEqualTo("Discharged home with a recovery plan by Dr Nguyen");
        });
        verify(tasks).deleteQuietly("task-1");
    }

    @Test
    void medChangeIsForwardedAndStored() {
        incident(ID, "margaret", true);
        when(agent.recovery(any())).thenReturn(new RecoveryResult("Home.", null,
                List.of(new RecoveryResult.Reminder("08:00", "MED", "Aspirin.", null)), false));

        recovery.discharge(ID, plan(List.of(new Med("aspirin", "100 mg", List.of("08:00"), "Stop")), List.of()));

        verify(agent).recovery(argThat(b -> ((Map<?, ?>) ((List<?>) ((Map<?, ?>) b.get("plan")).get("meds")).get(0))
                .get("change").equals("Stop")));
        assertThat(store.get(ID).recovery.meds.get(0).change()).isEqualTo("Stop");
    }

    @Test
    void medNoteIsForwardedAndStoredAsWritten() {
        incident(ID, "margaret", true);
        when(agent.recovery(any())).thenReturn(new RecoveryResult("Home.", null,
                List.of(new RecoveryResult.Reminder("08:00", "MED", "Apixaban.", null)), false));
        String note = "Stops clots forming because of the uneven heartbeat. Replaces aspirin.";

        recovery.discharge(ID, plan(List.of(new Med("apixaban", "5 mg", List.of("08:00"), "New", note),
                new Med("amlodipine", "5 mg", List.of("18:00"), "Continue")), List.of()));

        verify(agent).recovery(argThat(b -> ((Map<?, ?>) ((List<?>) ((Map<?, ?>) b.get("plan")).get("meds")).get(0))
                .get("note").equals(note)));
        assertThat(store.get(ID).recovery.meds).extracting(Med::note).containsExactly(note, null);
    }

    @Test
    void medNoteLongerThanTheTextLimitIsRejected() {
        incident(ID, "margaret", true);
        Recovery.Plan p = plan(List.of(new Med("apixaban", "5 mg", List.of("08:00"), "New", "x".repeat(301))), List.of());

        assertThatThrownBy(() -> recovery.discharge(ID, p)).isInstanceOf(ApiException.class);
        verify(agent, never()).recovery(any());
    }

    @Test
    void agentFailureFallsBackToSortedRuleReminders() {
        incident(ID, "margaret", true);
        when(agent.recovery(any())).thenThrow(new AgentException("down", null));
        Recovery.Plan p = plan(
                List.of(new Med("atorvastatin", "40 mg", List.of("20:00"), null), new Med("aspirin", "100 mg", List.of("08:00"), null)),
                List.of(new Activity("Walk for 15 minutes", List.of("10:00"))));

        recovery.discharge(ID, p);

        Incident inc = store.get(ID);
        assertThat(inc.status).isEqualTo(Status.CLOSED);
        assertThat(inc.recovery.fallback).isTrue();
        assertThat(inc.recovery.summary).isEqualTo("No driving for 4 weeks.");
        assertThat(inc.recovery.reminders).extracting(r -> r.time() + " " + r.kind() + " " + r.text()).containsExactly(
                "08:00 MED Time for your aspirin, 100 mg.",
                "10:00 ACTIVITY Time to walk for 15 minutes.",
                "20:00 MED Time for your atorvastatin, 40 mg.");
    }

    @Test
    void fallbackUsesTheActivityReminderWordingAsIs() {
        incident(ID, "margaret", true);
        when(agent.recovery(any())).thenThrow(new AgentException("down", null));

        recovery.discharge(ID, plan(List.of(),
                List.of(new Activity("Walk 20 minutes daily", List.of("10:00"), "Time for your 20-minute walk."))));

        assertThat(store.get(ID).recovery.reminders).extracting(r -> r.text()).containsExactly("Time for your 20-minute walk.");
    }

    @Test
    void vietnameseFallbackUsesMaVoice() {
        incident(ID, "ba-mai", true);
        when(agent.recovery(any())).thenThrow(new AgentException("down", null));

        recovery.discharge(ID, plan(List.of(new Med("aspirin", "100 mg", List.of("08:00"), null)),
                List.of(new Activity("Đi bộ 15 phút", List.of("10:00")))));

        assertThat(store.get(ID).recovery.reminders).extracting(r -> r.text()).containsExactly(
                "Mạ ơi, tới giờ uống aspirin 100 mg rồi.", "Mạ ơi, tới giờ đi bộ 15 phút rồi.");
    }

    @Test
    void badTimeIsRejectedAndNothingIsWritten() {
        incident(ID, "margaret", true);
        Recovery.Plan p = plan(List.of(new Med("aspirin", "100 mg", List.of("8:00"), null)), List.of());

        assertThatThrownBy(() -> recovery.discharge(ID, p)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.status()).isEqualTo(HttpStatus.BAD_REQUEST));

        assertThat(store.get(ID).recovery).isNull();
        assertThat(store.get(ID).status).isEqualTo(Status.ESCALATING);
        verify(agent, never()).recovery(any());
    }

    @Test
    void secondCallConflictsAndKeepsTheFirstPlan() {
        incident(ID, "margaret", true);
        when(agent.recovery(any())).thenThrow(new AgentException("down", null));
        recovery.discharge(ID, plan());

        Recovery.Plan other = new Recovery.Plan("Dr Other", "x", plan().meds(), List.of(), List.of(), "other notes");
        assertThatThrownBy(() -> recovery.discharge(ID, other)).isInstanceOfSatisfying(ApiException.class, e -> {
            assertThat(e.status()).isEqualTo(HttpStatus.CONFLICT);
            assertThat(e.code()).isEqualTo("INVALID_STATE");
        });

        assertThat(store.get(ID).recovery.staffName).isEqualTo("Dr Nguyen");
    }

    @Test
    void missingHandoffConflicts() {
        incident(ID, "margaret", false);

        assertThatThrownBy(() -> recovery.discharge(ID, plan())).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.status()).isEqualTo(HttpStatus.CONFLICT));

        assertThat(store.get(ID).recovery).isNull();
        verify(agent, never()).recovery(any());
    }

    @Test
    void emptyMedsAndActivitiesAreRejected() {
        incident(ID, "margaret", true);

        assertThatThrownBy(() -> recovery.discharge(ID, plan(List.of(), List.of())))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.status()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(audio, never()).save(anyString(), anyString(), any(), anyString());
    }

    @Test
    void malformedAgentReplyFallsBackToRuleReminders() {
        incident(ID, "margaret", true);
        when(agent.recovery(any())).thenReturn(new RecoveryResult("hi", null, null, false));

        recovery.discharge(ID, plan());

        Incident inc = store.get(ID);
        assertThat(inc.recovery.fallback).isTrue();
        assertThat(inc.recovery.summary).isEqualTo("No driving for 4 weeks.");
        assertThat(inc.recovery.reminders).extracting(r -> r.text()).containsExactly("Time for your aspirin, 100 mg.");
    }

    @Test
    void badBase64AudioIsDroppedNotFatal() {
        incident(ID, "margaret", true);
        when(agent.recovery(any())).thenReturn(new RecoveryResult("hi", "!!not-base64", List.of(
                new RecoveryResult.Reminder("08:00", "MED", "Time for your aspirin, 100 mg.", "!!not-base64")), false));

        recovery.discharge(ID, plan());

        Incident inc = store.get(ID);
        assertThat(inc.status).isEqualTo(Status.CLOSED);
        assertThat(inc.recovery.reminders.get(0).audioPath()).isNull();
        assertThat(inc.recovery.summaryAudioPath).isNull();
    }
}
