package com.noonealone.coreapi.data;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.EnumMap;
import java.util.Map;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import com.noonealone.coreapi.model.Docs;
import com.noonealone.coreapi.model.Scenario;

@Component
public class Scenarios {

    private final Map<Scenario, Fixture> fixtures = new EnumMap<>(Scenario.class);

    public Scenarios() {
        for (Scenario s : Scenario.values()) {
            try (InputStream in = new ClassPathResource("data/scenarios/" + s.slug + ".json").getInputStream()) {
                fixtures.put(s, Docs.mapper().readValue(in, Fixture.class));
            } catch (IOException e) {
                throw new UncheckedIOException("Missing fixture for " + s, e);
            }
        }
    }

    public Fixture get(Scenario scenario) {
        return fixtures.get(scenario);
    }
}
