package com.noonealone.coreapi.flow;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.stereotype.Service;

import com.noonealone.coreapi.data.Fixture;
import com.noonealone.coreapi.data.Scenarios;
import com.noonealone.coreapi.data.Seed;
import com.noonealone.coreapi.gcp.AlertPublisher;
import com.noonealone.coreapi.gcp.AudioStore;
import com.noonealone.coreapi.gcp.EscalationTimers;
import com.noonealone.coreapi.model.DemoCurrent;
import com.noonealone.coreapi.model.DemoSettings;
import com.noonealone.coreapi.model.Person;
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

    public String trigger(Scenario scenario, String personId, int timerSeconds, int noReplySeconds) {
        return trigger(scenario, personId, timerSeconds, noReplySeconds, null, null);
    }

    public String trigger(Scenario scenario, String personId, int timerSeconds, int noReplySeconds,
            Integer hr, Integer movementMin) {
        Person person = store.people().get(personId);
        if (person == null || person.circle == null || person.circle.isEmpty()) {
            throw ApiException.badRequest("Unknown person");
        }
        boolean running = store.current()
                .map(c -> store.find(c.incidentId).map(i -> i.status != Status.CLOSED).orElse(true)).orElse(false);
        if (running) {
            throw ApiException.invalidState("A demo incident is still running. Close or reset it first.");
        }
        Fixture f = scenarios.get(scenario);
        ZoneId zone = person.timezone == null ? StoryClock.DEFAULT_ZONE : ZoneId.of(person.timezone);
        DemoSettings settings = new DemoSettings();
        settings.timerSeconds = timerSeconds;
        settings.noReplySeconds = noReplySeconds;
        settings.clockOffsetMs = StoryClock.offsetFor(scenario, zone, clock);
        String id = "alert-" + clock.millis() + "-" + scenario.slug;

        DemoCurrent current = new DemoCurrent();
        current.incidentId = id;
        current.scenario = scenario.name();
        current.personId = personId;
        current.startedAt = StoryClock.storyStart(scenario, zone).toString();
        store.setCurrent(current);

        publisher.publish(new AlertMessage(id, personId, scenario, f.alert().kind(),
                hr != null ? hr : f.alert().hr(),
                movementMin != null ? movementMin : f.alert().movementMin(), settings));
        return id;
    }

    public void reset() {
        store.current().ifPresent(c -> {
            store.find(c.incidentId).ifPresent(inc -> {
                inc.assignments.forEach(a -> tasks.deleteQuietly(tasks.taskName(inc.id, a.memberId, 1)));
                tasks.deleteQuietly(tasks.taskName(inc.id, Handoff.TASK_MEMBER, 1));
                audio.deleteIncident(inc.id);
                store.delete(inc.id);
            });
            store.clearCurrent();
        });
        store.seed(seed.data());
    }
}
