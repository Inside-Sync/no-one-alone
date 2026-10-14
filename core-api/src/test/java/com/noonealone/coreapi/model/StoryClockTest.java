package com.noonealone.coreapi.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class StoryClockTest {

    private final Clock recording = Clock.fixed(Instant.parse("2026-10-17T13:00:00Z"), ZoneOffset.UTC);

    @Test
    void offsetMapsRecordingTimeToStoryStart() {
        long offset = StoryClock.offsetFor(Scenario.STROKE, recording);

        assertThat(offset).isEqualTo(-151020000L);
        assertThat(StoryClock.now(offset, recording)).isEqualTo("2026-10-15T19:03:00Z");
    }

    @Test
    void plusSecondsKeepsIsoSecondPrecision() {
        assertThat(StoryClock.plusSeconds("2026-10-15T19:04:30Z", 30)).isEqualTo("2026-10-15T19:05:00Z");
    }
}
