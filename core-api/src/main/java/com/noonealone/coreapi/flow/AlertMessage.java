package com.noonealone.coreapi.flow;

import com.noonealone.coreapi.model.DemoSettings;
import com.noonealone.coreapi.model.Scenario;

public record AlertMessage(String alertId, String personId, Scenario scenario, String kind,
        Integer hr, Integer movementMin, DemoSettings demo) {}
