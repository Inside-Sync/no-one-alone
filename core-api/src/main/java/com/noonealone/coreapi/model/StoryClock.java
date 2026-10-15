package com.noonealone.coreapi.model;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

public final class StoryClock {

    public static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private StoryClock() {}

    public static Instant storyStart(Scenario scenario, ZoneId zone) {
        return scenario.storyLocal.atZone(zone).toInstant();
    }

    public static long offsetFor(Scenario scenario, ZoneId zone, Clock clock) {
        return storyStart(scenario, zone).toEpochMilli() - clock.millis();
    }

    public static String now(long offsetMs, Clock clock) {
        return Instant.now(clock).plusMillis(offsetMs).truncatedTo(ChronoUnit.SECONDS).toString();
    }

    public static String plusSeconds(String iso, long seconds) {
        return Instant.parse(iso).plusSeconds(seconds).truncatedTo(ChronoUnit.SECONDS).toString();
    }
}
