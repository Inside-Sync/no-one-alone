package com.noonealone.coreapi.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class StoryClockTest {

    private final Clock recording = Clock.fixed(Instant.parse("2026-10-17T13:00:00Z"), ZoneOffset.UTC);

    private static final ZoneId HUE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final ZoneId SYDNEY = ZoneId.of("Australia/Sydney");

    @Test
    void offsetMapsRecordingTimeToStoryStart() {
        long offset = StoryClock.offsetFor(Scenario.STROKE, HUE, recording);

        assertThat(offset).isEqualTo(-151020000L);
        assertThat(StoryClock.now(offset, recording)).isEqualTo("2026-10-15T19:03:00Z");
    }

    @Test
    void baMaiKeepsTheContractInstants() {
        assertThat(StoryClock.storyStart(Scenario.STROKE, HUE)).isEqualTo(Instant.parse("2026-10-15T19:03:00Z"));
        assertThat(StoryClock.storyStart(Scenario.FALL, HUE)).isEqualTo(Instant.parse("2026-10-15T20:12:00Z"));
        assertThat(StoryClock.storyStart(Scenario.FALSE_ALARM, HUE)).isEqualTo(Instant.parse("2026-10-16T03:42:00Z"));
    }

    @Test
    void margaretsStrokeIsTwoAmSydneyTime() {
        assertThat(StoryClock.storyStart(Scenario.STROKE, SYDNEY)).isEqualTo(Instant.parse("2026-10-15T15:03:00Z"));
    }

    @Test
    void plusSecondsKeepsIsoSecondPrecision() {
        assertThat(StoryClock.plusSeconds("2026-10-15T19:04:30Z", 30)).isEqualTo("2026-10-15T19:05:00Z");
    }
}
