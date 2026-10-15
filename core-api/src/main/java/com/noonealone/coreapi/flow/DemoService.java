package com.noonealone.coreapi.flow;

import java.time.Clock;

import org.springframework.stereotype.Service;

import com.noonealone.coreapi.data.Fixture;
import com.noonealone.coreapi.data.Scenarios;
import com.noonealone.coreapi.data.Seed;
import com.noonealone.coreapi.gcp.AlertPublisher;
import com.noonealone.coreapi.gcp.AudioStore;
import com.noonealone.coreapi.gcp.EscalationTimers;
import com.noonealone.coreapi.model.DemoCurrent;
import com.noonealone.coreapi.model.DemoSettings;
import com.noonealone.coreapi.model.Scenario;
import com.noonealone.coreapi.model.Status;
import com.noonealone.coreapi.model.StoryClock;
import com.noonealone.coreapi.store.IncidentStore;
import com.noonealone.coreapi.web.ApiException;

@Service
public class DemoService {

    private final IncidentStore store;
    private final Scenarios scenarios;
    private final Seed seed;
    private final AlertPublisher publisher;
    private final EscalationTimers tasks;
    private final AudioStore audio;
    private final Clock clock;

    public DemoService(IncidentStore store, Scenarios scenarios, Seed seed, AlertPublisher publisher,
            EscalationTimers tasks, AudioStore audio, Clock clock) {
        this.store = store;
        this.scenarios = scenarios;
        this.seed = seed;
        this.publisher = publisher;
        this.tasks = tasks;
        this.audio = audio;
        this.clock = clock;
    }

    public String trigger(Scenario scenario, int timerSeconds, int noReplySeconds) {
        boolean running = store.current()
                .map(c -> store.find(c.incidentId).map(i -> i.status != Status.CLOSED).orElse(true)).orElse(false);
        if (running) {
            throw ApiException.invalidState("A demo incident is still running. Close or reset it first.");
        }
        Fixture f = scenarios.get(scenario);
        DemoSettings settings = new DemoSettings();
        settings.timerSeconds = timerSeconds;
        settings.noReplySeconds = noReplySeconds;
        settings.clockOffsetMs = StoryClock.offsetFor(scenario, StoryClock.DEFAULT_ZONE, clock);
        String id = "alert-" + clock.millis() + "-" + scenario.slug;

        DemoCurrent current = new DemoCurrent();
        current.incidentId = id;
        current.scenario = scenario.name();
        current.startedAt = StoryClock.storyStart(scenario, StoryClock.DEFAULT_ZONE).toString();
        store.setCurrent(current);

        publisher.publish(new AlertMessage(id, f.personId(), scenario, f.alert().kind(), f.alert().hr(),
                f.alert().movementMin(), settings));
        return id;
    }

    public void reset() {
        store.current().ifPresent(c -> {
            store.find(c.incidentId).ifPresent(inc -> {
                inc.assignments.forEach(a -> tasks.deleteQuietly(tasks.taskName(inc.id, a.memberId, 1)));
                audio.deleteIncident(inc.id);
                store.delete(inc.id);
            });
            store.clearCurrent();
        });
        store.seed(seed.data());
    }
}
