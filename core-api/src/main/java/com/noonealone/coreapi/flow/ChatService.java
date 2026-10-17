package com.noonealone.coreapi.flow;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Person;
import com.noonealone.coreapi.store.IncidentStore;
import com.noonealone.coreapi.web.ApiException;

@Service
public class ChatService {

    public record Line(String by, String text) {}

    public record Request(String question, String mode, String viewer, List<Line> history) {}

    private static final String PERSON = "margaret";

    private final IncidentStore store;
    private final RespondAgentClient agent;

    public ChatService(IncidentStore store, RespondAgentClient agent) {
        this.store = store;
        this.agent = agent;
    }

    public String answer(Request r) {
        validate(r);
        Map<String, Object> body = new HashMap<>();
        body.put("question", r.question().trim());
        body.put("mode", r.mode());
        body.put("viewer", r.viewer());
        body.put("history", r.history() == null ? List.of() : r.history());
        body.put("snapshot", incident().map(this::snapshot).orElse(null));
        return agent.chat(body).answer();
    }

    private static void validate(Request r) {
        if (r.question() == null || r.question().isBlank() || r.question().length() > 500) {
            throw ApiException.badRequest("question must be 1..500 characters");
        }
        if (!Set.of("hosp", "self", "fam").contains(r.mode())) {
            throw ApiException.badRequest("mode must be hosp, self or fam");
        }
        if (r.viewer() != null && r.viewer().length() > 100) {
            throw ApiException.badRequest("viewer is too long");
        }
        if (r.history() != null && (r.history().size() > 10 || r.history().stream().anyMatch(l -> l == null
                || !Set.of("me", "noa").contains(l.by()) || l.text() == null || l.text().length() > 2000))) {
            throw ApiException.badRequest("history must be at most 10 lines by me or noa");
        }
    }

    private Optional<Incident> incident() {
        return store.current().flatMap(c -> c.incidentId == null ? Optional.empty() : store.find(c.incidentId))
                .filter(i -> PERSON.equals(i.personId))
                .or(() -> store.latest(PERSON));
    }

    private Map<String, Object> snapshot(Incident inc) {
        Map<String, Person> people = store.people();
        Map<String, Object> s = new HashMap<>();
        s.put("status", inc.status == null ? null : inc.status.name());
        s.put("level", inc.level == null ? null : inc.level.name());
        s.put("reason", inc.triage == null || inc.triage.reasons == null ? null : String.join(", ", inc.triage.reasons));
        List<Map<String, String>> timeline = inc.timeline.stream()
                .skip(Math.max(0, inc.timeline.size() - 25)).map(t -> Map.of("at", t.at, "text", t.text)).toList();
        s.put("timeline", timeline);
        s.put("assignments", inc.assignments.stream().map(a -> {
            Map<String, Object> m = new HashMap<>();
            m.put("name", EscalationRules.name(people, a.memberId));
            m.put("role", a.role == null ? null : a.role.name());
            m.put("state", a.state == null ? null : a.state.name());
            m.put("etaMin", a.etaMin);
            return m;
        }).toList());
        s.put("hospital", inc.handoff == null ? null : inc.handoff.hospitalName);
        if (inc.recovery != null) {
            s.put("recoverySummary", inc.recovery.summary);
            s.put("reminders", inc.recovery.reminders == null ? List.of() : inc.recovery.reminders.stream()
                    .map(r -> Map.of("time", String.valueOf(r.time()), "text", String.valueOf(r.text()))).toList());
        }
        return s;
    }
}
