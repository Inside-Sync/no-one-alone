package com.noonealone.coreapi.model;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

public final class StoryClock {

    private StoryClock() {}

    public static long offsetFor(Scenario scenario, Clock clock) {
        return scenario.storyStart.toEpochMilli() - clock.millis();
    }

    public static String now(long offsetMs, Clock clock) {
        return Instant.now(clock).plusMillis(offsetMs).truncatedTo(ChronoUnit.SECONDS).toString();
    }

    public static String plusSeconds(String iso, long seconds) {
        return Instant.parse(iso).plusSeconds(seconds).truncatedTo(ChronoUnit.SECONDS).toString();
    }
}
