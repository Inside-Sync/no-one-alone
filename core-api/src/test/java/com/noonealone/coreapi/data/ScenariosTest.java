package com.noonealone.coreapi.data;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.noonealone.coreapi.model.Scenario;

class ScenariosTest {

    @Test
    void everyScenarioHasAFifteenMinuteWindow() {
        Scenarios scenarios = new Scenarios();
        for (Scenario s : Scenario.values()) {
            Fixture f = scenarios.get(s);
            assertThat(f.window()).hasSize(15);
            assertThat(f.window().get(0).minutesBefore()).isEqualTo(15);
        }
        assertThat(new Seed().data().people().get("ba-mai").circle).hasSize(3);
    }
}
