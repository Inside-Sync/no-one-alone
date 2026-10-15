package com.noonealone.coreapi.data;

import java.util.List;

public record Fixture(FixtureAlert alert, List<WindowPoint> window, List<String> meds,
        List<String> allergies) {

    public record FixtureAlert(String kind, int hr, int movementMin) {}

    public record WindowPoint(int minutesBefore, int hr, int steps, boolean moving) {}
}
