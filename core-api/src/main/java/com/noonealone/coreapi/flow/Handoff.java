package com.noonealone.coreapi.flow;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.noonealone.coreapi.agent.HandoffResult;
import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.gcp.RoutesClient;
import com.noonealone.coreapi.model.HandoffInfo;
import com.noonealone.coreapi.model.Hospital;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Person;
import com.noonealone.coreapi.model.Role;
import com.noonealone.coreapi.store.IncidentStore;

@Service
public class Handoff {

    private final IncidentStore store;
    private final RespondAgentClient agent;
    private final RoutesClient routes;

    public Handoff(IncidentStore store, RespondAgentClient agent, RoutesClient routes) {
        this.store = store;
        this.agent = agent;
        this.routes = routes;
    }

    public void start(String incidentId) {
        Incident inc = store.get(incidentId);
        Person person = store.person(inc.personId);
        boolean stroke = inc.hasSlurredTurn();
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
            x.log(now, "SYSTEM", "HANDOFF_SENT", "Pre-arrival packet sent to " + chosen.name);
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
                x.log(now, "SYSTEM", "HANDOFF_RECEIVED", chosen.name + " received the packet");
            } else {
                x.log(now, "SYSTEM", "HANDOFF_FAILED", "Could not reach " + chosen.name);
            }
            return true;
        });
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
