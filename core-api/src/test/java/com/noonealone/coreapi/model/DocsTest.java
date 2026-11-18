package com.noonealone.coreapi.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;

class DocsTest {

    @Test
    void omitsNullFieldsButKeepsNullOwnerId() {
        Incident incident = new Incident();
        incident.personId = "margaret";
        incident.status = Status.VERIFYING;

        Map<String, Object> map = Docs.toMap(incident);

        assertThat(map).containsEntry("personId", "margaret").containsEntry("status", "VERIFYING");
        assertThat(map).containsKey("ownerId");
        assertThat(map.get("ownerId")).isNull();
        assertThat(map).doesNotContainKeys("level", "handoff", "lastKnownWellAt", "id");
    }

    @Test
    void roundTripsLongsFromFirestoreIntoInts() {
        Map<String, Object> stored = Map.of("personId", "margaret", "version", 3L, "zzz", 1L,
                "demo", Map.of("timerSeconds", 30L, "noReplySeconds", 15L, "clockOffsetMs", -151020000L));

        Incident incident = Docs.fromMap(stored, Incident.class);

        assertThat(incident.version).isEqualTo(3);
        assertThat(incident.demo.timerSeconds).isEqualTo(30);
        assertThat(incident.demo.clockOffsetMs).isEqualTo(-151020000L);
    }

    @Test
    void timelineLinesKeepTheirCodesNextToTheText() {
        Incident incident = new Incident();
        incident.log("2026-10-15T22:03:00Z", "SYSTEM", "NOTIFIED", "Calling Hamad", "david", Params.of("etaMin", 6, "attempt", null));
        incident.log("2026-10-15T22:04:00Z", "SYSTEM", "NO_NEARBY", "No one nearby accepted", null, null);
        incident.log("2026-10-15T22:05:00Z", "SYSTEM", "CLOSED", "Closed");

        Map<String, Object> map = Docs.toMap(incident);

        @SuppressWarnings("unchecked")
        java.util.List<Map<String, Object>> lines = (java.util.List<Map<String, Object>>) map.get("timeline");
        assertThat(lines.get(0)).containsEntry("kind", "NOTIFIED").containsEntry("text", "Calling Hamad")
                .containsEntry("memberId", "david").containsEntry("params", Map.of("etaMin", 6));
        assertThat(lines.get(1)).doesNotContainKeys("memberId", "params");
        assertThat(lines.get(2)).doesNotContainKeys("memberId", "params");
        Incident back = Docs.fromMap(map, Incident.class);
        assertThat(back.timeline.get(0).memberId).isEqualTo("david");
        assertThat(back.timeline.get(0).params).containsEntry("etaMin", 6);
    }

    @Test
    void checkInQuestionsKeepWhichScriptedQuestionTheyAre() {
        Incident incident = new Incident();
        Turn t = new Turn();
        t.by = "AGENT";
        t.text = "Please repeat after me: The sky is blue in Abu Dhabi.";
        t.kind = "SPEECH_CHECK";
        incident.checkIn.turns.add(t);
        incident.checkIn.pending = new Pending();
        incident.checkIn.pending.kind = "VOICE";
        incident.checkIn.pending.step = "SPEECH_CHECK";

        Incident back = Docs.fromMap(Docs.toMap(incident), Incident.class);

        assertThat(back.checkIn.turns.get(0).kind).isEqualTo("SPEECH_CHECK");
        assertThat(back.checkIn.pending.step).isEqualTo("SPEECH_CHECK");
        assertThat(Docs.toMap(new Turn())).doesNotContainKey("kind");
    }

    @Test
    void recoveryItemsKeepTheirKeysAndOldDocumentsWithoutKeysStillLoad() {
        Incident incident = new Incident();
        incident.recovery = new RecoveryInfo();
        incident.recovery.meds = java.util.List.of(new RecoveryInfo.Med("Apixaban", "5 mg", java.util.List.of("08:00"), "New", null, "apixaban"));
        incident.recovery.activities = java.util.List.of(new RecoveryInfo.Activity("Walk", java.util.List.of("10:00"), null, "walk"));
        incident.recovery.reminders = java.util.List.of(new RecoveryInfo.Reminder("08:00", "MED", "Time for your Apixaban, 5 mg.", null, "apixaban"));

        Incident back = Docs.fromMap(Docs.toMap(incident), Incident.class);

        assertThat(back.recovery.meds.get(0).key()).isEqualTo("apixaban");
        assertThat(back.recovery.activities.get(0).key()).isEqualTo("walk");
        assertThat(back.recovery.reminders.get(0).key()).isEqualTo("apixaban");
        Map<String, Object> old = Map.of("meds", java.util.List.of(Map.of("name", "aspirin", "dose", "100 mg", "times", java.util.List.of("08:00"))),
                "reminders", java.util.List.of(Map.of("time", "08:00", "kind", "MED", "text", "t")));
        RecoveryInfo loaded = Docs.fromMap(old, RecoveryInfo.class);
        assertThat(loaded.meds.get(0).key()).isNull();
        assertThat(loaded.reminders.get(0).key()).isNull();
    }

    @Test
    void pronunciationScoresSurviveStorageAndAreAbsentWhenNotScored() {
        Assessment a = new Assessment();
        a.pronunciation = new Assessment.Pronunciation();
        a.pronunciation.overall = 61.2;

        assertThat(Docs.fromMap(Docs.toMap(a), Assessment.class).pronunciation.overall).isEqualTo(61.2);
        assertThat(Docs.toMap(new Assessment())).doesNotContainKey("pronunciation");
    }
}
