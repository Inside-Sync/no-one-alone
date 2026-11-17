package com.noonealone.coreapi.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class StoryClockTest {

    private final Clock recording = Clock.fixed(Instant.parse("2026-10-17T13:00:00Z"), ZoneOffset.UTC);

    private static final ZoneId DUBAI = ZoneId.of("Asia/Dubai");

    @Test
    void offsetMapsRecordingTimeToStoryStart() {
        long offset = StoryClock.offsetFor(Scenario.STROKE, DUBAI, recording);

        assertThat(offset).isEqualTo(-140220000L);
        assertThat(StoryClock.now(offset, recording)).isEqualTo("2026-10-15T22:03:00Z");
    }

    @Test
    void mozaKeepsTheContractInstants() {
        assertThat(StoryClock.storyStart(Scenario.STROKE, DUBAI)).isEqualTo(Instant.parse("2026-10-15T22:03:00Z"));
        assertThat(StoryClock.storyStart(Scenario.FALL, DUBAI)).isEqualTo(Instant.parse("2026-10-15T23:12:00Z"));
        assertThat(StoryClock.storyStart(Scenario.FALSE_ALARM, DUBAI)).isEqualTo(Instant.parse("2026-10-16T06:42:00Z"));
    }

    @Test
    void theDefaultZoneIsAbuDhabiTime() {
        assertThat(StoryClock.DEFAULT_ZONE).isEqualTo(DUBAI);
    }

    @Test
    void plusSecondsKeepsIsoSecondPrecision() {
        assertThat(StoryClock.plusSeconds("2026-10-15T19:04:30Z", 30)).isEqualTo("2026-10-15T19:05:00Z");
    }
}
