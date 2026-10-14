package com.noonealone.coreapi.model;

import java.time.Instant;
import java.util.Arrays;
import java.util.Optional;

public enum Scenario {
    STROKE("stroke", "2026-10-15T19:03:00Z"),
    FALL("fall", "2026-10-15T20:12:00Z"),
    FALSE_ALARM("false-alarm", "2026-10-16T03:42:00Z");

    public final String slug;
    public final Instant storyStart;

    Scenario(String slug, String storyStart) {
        this.slug = slug;
        this.storyStart = Instant.parse(storyStart);
    }

    public static Optional<Scenario> fromSlug(String slug) {
        return Arrays.stream(values()).filter(s -> s.slug.equals(slug)).findFirst();
    }
}
