package com.noonealone.coreapi.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;

class DocsTest {

    @Test
    void omitsNullFieldsButKeepsNullOwnerId() {
        Incident incident = new Incident();
        incident.personId = "ba-mai";
        incident.status = Status.VERIFYING;

        Map<String, Object> map = Docs.toMap(incident);

        assertThat(map).containsEntry("personId", "ba-mai").containsEntry("status", "VERIFYING");
        assertThat(map).containsKey("ownerId");
        assertThat(map.get("ownerId")).isNull();
        assertThat(map).doesNotContainKeys("level", "handoff", "lastKnownWellAt", "id");
    }

    @Test
    void roundTripsLongsFromFirestoreIntoInts() {
        Map<String, Object> stored = Map.of("personId", "ba-mai", "version", 3L, "zzz", 1L,
                "demo", Map.of("timerSeconds", 30L, "noReplySeconds", 15L, "clockOffsetMs", -151020000L));

        Incident incident = Docs.fromMap(stored, Incident.class);

        assertThat(incident.version).isEqualTo(3);
        assertThat(incident.demo.timerSeconds).isEqualTo(30);
        assertThat(incident.demo.clockOffsetMs).isEqualTo(-151020000L);
    }
}
