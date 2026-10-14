package com.noonealone.coreapi.flow;

import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.noonealone.coreapi.agent.AgentException;
import com.noonealone.coreapi.agent.PlanResult;
import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.data.Fixture;
import com.noonealone.coreapi.data.Scenarios;
import com.noonealone.coreapi.gcp.AudioStore;
import com.noonealone.coreapi.gcp.EscalationTimers;
import com.noonealone.coreapi.gcp.RoutesClient;
import com.noonealone.coreapi.model.Assignment;
import com.noonealone.coreapi.model.AssignmentState;
import com.noonealone.coreapi.model.CircleEntry;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Level;
import com.noonealone.coreapi.model.Person;
import com.noonealone.coreapi.model.PersonInstruction;
import com.noonealone.coreapi.model.Role;
import com.noonealone.coreapi.model.Status;
import com.noonealone.coreapi.store.IncidentStore;

@Service
public class Escalation {

    private static final Logger log = LoggerFactory.getLogger(Escalation.class);

    private final IncidentStore store;
    private final RespondAgentClient agent;
    private final RoutesClient routes;
    private final EscalationTimers tasks;
    private final AudioStore audio;
    private final Scenarios scenarios;
    private final Handoff handoff;

    public Escalation(IncidentStore store, RespondAgentClient agent, RoutesClient routes, EscalationTimers tasks,
            AudioStore audio, Scenarios scenarios, Handoff handoff) {
        this.store = store;
        this.agent = agent;
        this.routes = routes;
        this.tasks = tasks;
        this.audio = audio;
        this.scenarios = scenarios;
        this.handoff = handoff;
    }

    public void start(String incidentId) {
        Incident inc = store.get(incidentId);
        if (inc.status != Status.CHECKING_IN) {
            return;
        }
        Person person = store.person(inc.personId);
        Map<String, Person> people = store.people();
        List<CircleEntry> circle = person.circle.stream().filter(c -> c.criticalAlerts)
                .sorted(Comparator.comparingInt(c -> c.priority)).toList();
        Map<String, Integer> eta = new HashMap<>();
        for (CircleEntry c : circle) {
            if (c.role == Role.NEARBY && people.containsKey(c.memberId)) {
                routes.etaMinutes(people.get(c.memberId).location, person.location).ifPresent(m -> eta.put(c.memberId, m));
            }
        }

        PlanResult plan;
        boolean fallback = false;
        try {
            plan = agent.plan(planBody(inc, person, circle, people, eta));
        } catch (AgentException e) {
            plan = fallbackPlan(person, circle);
            fallback = true;
        }
        Map<String, String> messages = new HashMap<>();
        plan.messages().forEach(m -> messages.put(m.memberId(), m.text()));
        String instructionAudio = null;
        if (plan.personInstruction() != null && plan.personInstruction().audioBase64() != null) {
            try {
                instructionAudio = audio.save(incidentId, "instruction.mp3",
                        Base64.getDecoder().decode(plan.personInstruction().audioBase64()), "audio/mpeg");
            } catch (RuntimeException e) {
                log.warn("Instruction audio not saved for incident {}: {}", incidentId, e.getClass().getSimpleName());
            }
        }

        Optional<CircleEntry> firstNearby = circle.stream().filter(c -> c.role == Role.NEARBY).findFirst();
        String firstTask = null;
        if (firstNearby.isPresent()) {
            try {
                firstTask = tasks.schedule(incidentId, firstNearby.get().memberId, 1, inc.demo.timerSeconds);
            } catch (RuntimeException e) {
                log.warn("Escalation timer not scheduled for incident {}: {}", incidentId, e.getClass().getSimpleName());
            }
        }
        String timerName = firstTask;
        String audioPath = instructionAudio;

        PlanResult result = plan;
        boolean usedFallback = fallback;
        IncidentStore.Mutation m = store.mutate(incidentId, (x, now) -> {
            if (x.status != Status.CHECKING_IN) {
                return false;
            }
            x.status = Status.ESCALATING;
            x.callScript = result.callScript();
            if (result.personInstruction() != null) {
                x.personInstruction = new PersonInstruction();
                x.personInstruction.scriptIds = result.personInstruction().scriptIds();
                x.personInstruction.text = result.personInstruction().text();
                x.personInstruction.audioPath = audioPath;
            }
            if (usedFallback) {
                x.log(now, "AGENT", "AGENT_FALLBACK", "Plan used fallback");
            }
            for (CircleEntry c : circle) {
                Assignment a = new Assignment();
                a.memberId = c.memberId;
                a.role = c.role;
                a.message = messages.get(c.memberId);
                if (c.role == Role.DISTANT) {
                    a.state = AssignmentState.NOTIFIED;
                    a.notifiedAt = now;
                    a.actions = List.of("CALL_PERSON", "CALLED_115");
                } else {
                    a.state = AssignmentState.QUEUED;
                    a.actions = List.of("ACCEPT", "DECLINE");
                    a.attempt = 1;
                    a.etaMin = eta.get(c.memberId);
                }
                x.assignments.add(a);
            }
            Optional<Assignment> next = EscalationRules.nextQueued(x);
            if (next.isPresent()) {
                EscalationRules.notify(x, next.get(), now, timerName, people);
            } else {
                EscalationRules.noNearby(x, now);
            }
            x.assignments.stream().filter(a -> a.role == Role.DISTANT).forEach(a ->
                    x.log(now, "SYSTEM", "NOTIFIED", EscalationRules.name(people, a.memberId) + " notified"));
            return true;
        });
        if (m.changed() && inc.level == Level.EMERGENCY) {
            try {
                handoff.start(incidentId);
            } catch (RuntimeException e) {
                log.warn("Handoff not started for incident {}: {}", incidentId, e.getClass().getSimpleName());
            }
        }
    }

    private Map<String, Object> planBody(Incident inc, Person person, List<CircleEntry> circle,
            Map<String, Person> people, Map<String, Integer> eta) {
        Fixture f = scenarios.get(inc.scenario);
        List<Map<String, Object>> members = circle.stream().map(c -> {
            Map<String, Object> m = new HashMap<>();
            Person p = people.get(c.memberId);
            m.put("memberId", c.memberId);
            m.put("displayName", p == null ? c.memberId : p.displayName);
            m.put("relation", c.relation);
            m.put("role", c.role.name());
            m.put("locale", p == null ? "vi-VN" : p.locale);
            if (eta.containsKey(c.memberId)) {
                m.put("etaMin", eta.get(c.memberId));
            }
            return m;
        }).toList();
        Map<String, Object> context = new HashMap<>();
        context.put("lastKnownWellAt", inc.lastKnownWellAt);
        context.put("findings", inc.triage == null ? List.of() : inc.triage.reasons);
        context.put("meds", f.meds());
        context.put("allergies", f.allergies());
        Map<String, Object> p = new HashMap<>();
        p.put("displayName", person.displayName);
        p.put("dialect", person.dialect);
        p.put("locale", person.locale);
        p.put("timezone", person.timezone);
        p.put("addressText", person.addressText);
        return Map.of("person", p, "level", inc.level.name(), "context", context, "members", members);
    }

    private static PlanResult fallbackPlan(Person person, List<CircleEntry> circle) {
        List<PlanResult.Message> messages = circle.stream().map(c -> new PlanResult.Message(c.memberId,
                c.role == Role.NEARBY
                        ? person.displayName + " needs help now. Please go to " + person.addressText + "."
                        : person.displayName + " needs help. Family nearby has been alerted.")).toList();
        return new PlanResult(messages, person.addressText + ". " + person.displayName + ", " + person.age + ".", null, true);
    }
}
