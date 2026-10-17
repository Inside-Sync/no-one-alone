package com.noonealone.coreapi.flow;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.noonealone.coreapi.agent.HandoffResult;
import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.gcp.EscalationTimers;
import com.noonealone.coreapi.gcp.RoutesClient;
import com.noonealone.coreapi.model.HandoffInfo;
import com.noonealone.coreapi.model.Hospital;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Level;
import com.noonealone.coreapi.model.Person;
import com.noonealone.coreapi.model.Role;
import com.noonealone.coreapi.model.StoryClock;
import com.noonealone.coreapi.store.IncidentStore;

@Service
public class Handoff {

    static final String TASK_MEMBER = "handoff";
    static final int HANDOFF_DELAY_SECONDS = 25;
    private static final Logger log = LoggerFactory.getLogger(Handoff.class);
    private static final String SCRIPT_PERSON = "margaret";
    private static final List<String> BLOOD_THINNERS = List.of("apixaban", "rivaroxaban", "dabigatran", "edoxaban", "warfarin", "heparin", "enoxaparin");
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private final IncidentStore store;
    private final RespondAgentClient agent;
    private final RoutesClient routes;
    private final EscalationTimers tasks;

    public Handoff(IncidentStore store, RespondAgentClient agent, RoutesClient routes, EscalationTimers tasks) {
        this.store = store;
        this.agent = agent;
        this.routes = routes;
        this.tasks = tasks;
    }

    // Starts the hand-off once the automatic 000 call is logged, after the 000 dialogue when Cloud Tasks runs.
    public void afterCall(String incidentId) {
        try {
            Incident inc = store.get(incidentId);
            boolean called = inc.timeline.stream().anyMatch(t -> "SYSTEM".equals(t.actor) && "CALLED_115".equals(t.kind));
            if (inc.level != Level.EMERGENCY || !called || inc.handoff != null) {
                return;
            }
            if (tasks.enabled()) {
                tasks.schedule(incidentId, TASK_MEMBER, 1, HANDOFF_DELAY_SECONDS);
            } else {
                start(incidentId);
            }
        } catch (RuntimeException e) {
            log.warn("Handoff not started for incident {}: {}", incidentId, e.getClass().getSimpleName());
        }
    }

    // A Cloud Tasks retry loop is worse than a missing hand-off, so the timer path never throws.
    public void startQuietly(String incidentId) {
        try {
            start(incidentId);
        } catch (RuntimeException e) {
            log.warn("Handoff failed for incident {}: {}", incidentId, e.getClass().getSimpleName());
        }
    }

    public void start(String incidentId) {
        Incident inc = store.get(incidentId);
        Person person = store.person(inc.personId);
        boolean stroke = inc.suspectedStroke();
        List<Hospital> candidates = store.hospitals().stream().filter(h -> !stroke || h.strokeReady).toList();
        if (candidates.isEmpty()) {
            return;
        }
        Map<String, Integer> eta = new HashMap<>();
        for (Hospital h : candidates) {
            // 5 degrees, about 500 km: no Routes calls across continents.
            if (distance(person, h) > 5) {
                continue;
            }
            routes.etaMinutes(person.location, h.location).ifPresent(m -> eta.put(h.id, m));
        }
        Hospital chosen = candidates.stream()
                .min(Comparator.comparingDouble(h -> eta.containsKey(h.id) ? eta.get(h.id) : 1000 + distance(person, h)))
                .orElseThrow();

        boolean started = store.mutate(incidentId, (x, now) -> {
            if (x.handoff != null) {
                return false;
            }
            x.handoff = new HandoffInfo();
            x.handoff.hospitalId = chosen.id;
            x.handoff.hospitalName = chosen.name;
            x.handoff.etaMin = eta.get(chosen.id);
            x.handoff.status = "PENDING";
            x.handoff.sentAt = now;
            x.log(now, "AGENT", "HANDOFF_SENT", notice(x, person, eta.get(chosen.id)));
            return true;
        }).changed();
        if (!started) {
            return;
        }

        HandoffResult result;
        try {
            result = agent.handoff(body(inc, person, stroke, chosen, eta.get(chosen.id)));
        } catch (RuntimeException e) {
            result = new HandoffResult("FAILED", null, true);
        }
        HandoffResult r = result;
        store.mutate(incidentId, (x, now) -> {
            x.handoff.status = "RECEIVED".equals(r.status()) ? "RECEIVED" : "FAILED";
            x.handoff.packet = r.packet();
            if (r.fallback()) {
                x.log(now, "AGENT", "AGENT_FALLBACK", "Handoff used fallback");
            }
            if ("RECEIVED".equals(x.handoff.status)) {
                x.log(now, "SYSTEM", "HANDOFF_RECEIVED", "Received. Stroke call activated, CT scanner on standby.");
                x.log(now, "AGENT", "FAMILY_UPDATE", familyUpdate(x, person, chosen));
            } else {
                x.log(now, "SYSTEM", "HANDOFF_FAILED", "Could not reach " + chosen.name);
            }
            return true;
        });
    }

    private String notice(Incident x, Person person, Integer etaMin) {
        // ponytail: Margaret's 000 call is recorded audio with the script's numbers, so her notice says the same ones
        boolean script = SCRIPT_PERSON.equals(x.personId);
        ZoneId zone = person.timezone == null ? StoryClock.DEFAULT_ZONE : ZoneId.of(person.timezone);
        List<String> parts = new ArrayList<>();
        parts.add("This is Noa from No One Alone");
        String sex = "F".equals(person.sex) ? ", female" : "M".equals(person.sex) ? ", male" : "";
        parts.add(person.displayName + (person.age == null ? "" : ", " + person.age) + sex);
        if (x.suspectedStroke()) {
            parts.add("Suspected stroke");
        }
        if (script) {
            parts.add("Last seen well 01:30");
        } else if (x.lastKnownWellAt != null) {
            parts.add("Last seen well " + hhmm(x.lastKnownWellAt, zone));
        }
        Optional<String> slurred = x.checkIn.turns.stream().filter(t -> t.assessment != null && "SLURRED".equals(t.assessment.clarity))
                .findFirst().map(t -> t.at != null ? t.at
                        : x.timeline.stream().filter(e -> "TRIAGED".equals(e.kind)).map(e -> e.at).findFirst().orElse(null));
        slurred.ifPresent(at -> parts.add("Slurred speech found " + (script ? "01:40" : hhmm(at, zone))));
        if (script) {
            parts.add("Heart rate up to 137");
        } else if (x.alert != null && x.alert.hr != null) {
            parts.add("Heart rate up to " + x.alert.hr);
        }
        if (person.meds != null && !person.meds.isEmpty()) {
            // ponytail: drug name is the first word of each seed entry ("aspirin 100 mg each morning")
            List<String> names = person.meds.stream().map(m -> m.split(" ")[0]).toList();
            boolean thinner = names.stream().anyMatch(n -> BLOOD_THINNERS.contains(n.toLowerCase()));
            parts.add("On " + String.join(", ", names) + (thinner ? "" : ", not on blood thinners"));
        }
        if (person.allergies != null && !person.allergies.isEmpty()) {
            parts.add("Allergy: " + String.join(", ", person.allergies));
        }
        if (script) {
            parts.add("ETA 12 min");
        } else if (etaMin != null) {
            parts.add("ETA " + etaMin + " min");
        }
        Optional.ofNullable(person.circle).flatMap(c -> c.stream().filter(e -> e.role == Role.DISTANT).findFirst())
                .ifPresent(e -> parts.add("Next of kin: " + EscalationRules.name(store.people(), e.memberId) + " (" + e.relation + ")"));
        return String.join(". ", parts) + ".";
    }

    private String familyUpdate(Incident x, Person person, Hospital h) {
        String owner = x.ownerId == null ? null : firstName(store.people().get(x.ownerId), x.ownerId);
        return "An ambulance is on its way to " + firstName(person, person.displayName) + " (about 12 minutes). The stroke team at "
                + h.name + " has her details. " + (owner == null ? "I'm staying with her." : owner + " is on his way.");
    }

    // Vietnamese display names start with a title (Bà Mai), so keep them whole.
    private static String firstName(Person p, String fallback) {
        if (p == null) {
            return fallback;
        }
        return p.locale != null && p.locale.startsWith("vi") ? p.displayName : p.displayName.split(" ")[0];
    }

    private static String hhmm(String iso, ZoneId zone) {
        return HH_MM.format(Instant.parse(iso).atZone(zone));
    }

    private Map<String, Object> body(Incident inc, Person person, boolean stroke, Hospital h, Integer etaMin) {
        Map<String, Object> hospital = new HashMap<>();
        hospital.put("id", h.id);
        hospital.put("name", h.name);
        if (etaMin != null) {
            hospital.put("etaMin", etaMin);
        }
        Map<String, Object> body = new HashMap<>();
        body.put("incidentId", inc.id);
        body.put("personId", inc.personId);
        body.put("level", inc.level.name());
        body.put("suspected", stroke ? "STROKE" : "UNKNOWN");
        if (inc.lastKnownWellAt != null) {
            body.put("lastKnownWellAt", inc.lastKnownWellAt);
        }
        body.put("findings", inc.triage == null ? List.of() : inc.triage.reasons);
        body.put("hospital", hospital);
        // ponytail: first NEARBY member, not the owner; nobody has accepted yet when handoff runs
        Optional.ofNullable(person.circle).flatMap(c -> c.stream().filter(e -> e.role == Role.NEARBY).findFirst())
                .ifPresent(e -> body.put("onScene", Map.of("name", store.person(e.memberId).displayName, "relation", e.relation)));
        return body;
    }

    private static double distance(Person p, Hospital h) {
        double dLat = p.location.lat - h.location.lat;
        double dLng = p.location.lng - h.location.lng;
        return Math.sqrt(dLat * dLat + dLng * dLng);
    }
}
