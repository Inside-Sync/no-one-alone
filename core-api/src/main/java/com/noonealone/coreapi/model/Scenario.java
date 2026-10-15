package com.noonealone.coreapi.model;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Optional;

public enum Scenario {
    STROKE("stroke", "2026-10-16T02:03:00"),
    FALL("fall", "2026-10-16T03:12:00"),
    FALSE_ALARM("false-alarm", "2026-10-16T10:42:00");

    public final String slug;
    /** Wall-clock story time in the older person's own timezone. */
    public final LocalDateTime storyLocal;

    Scenario(String slug, String storyLocal) {
        this.slug = slug;
        this.storyLocal = LocalDateTime.parse(storyLocal);
    }

    public static Optional<Scenario> fromSlug(String slug) {
        return Arrays.stream(values()).filter(s -> s.slug.equals(slug)).findFirst();
    }
}
