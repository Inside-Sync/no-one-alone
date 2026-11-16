package com.noonealone.coreapi.flow;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.noonealone.coreapi.model.Assignment;
import com.noonealone.coreapi.model.AssignmentState;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Params;
import com.noonealone.coreapi.model.Person;
import com.noonealone.coreapi.model.Role;
import com.noonealone.coreapi.model.StoryClock;

final class EscalationRules {

    static final String DEFAULT_EMERGENCY_NUMBER = "998";

    private EscalationRules() {}

    static Optional<Assignment> nextQueued(Incident inc) {
        return inc.assignments.stream()
                .filter(a -> a.state == AssignmentState.QUEUED)
                .findFirst();
    }

    static void notify(Incident inc, Assignment a, String now, String taskName, Map<String, Person> people) {
        a.state = AssignmentState.NOTIFIED;
        a.notifiedAt = now;
        a.deadlineAt = StoryClock.plusSeconds(now, inc.demo.timerSeconds);
        inc.escalationTaskName = taskName;
        inc.log(now, "SYSTEM", "NOTIFIED", "Calling " + name(people, a.memberId) + (a.message == null ? "" : ": " + a.message),
                a.memberId, Params.of("etaMin", a.etaMin, "attempt", a.attempt));
    }

    static void noNearby(Incident inc, String now, Map<String, Person> people) {
        inc.escalationTaskName = null;
        inc.log(now, "SYSTEM", "NO_NEARBY", "No one nearby accepted", null, null);
        autoCall(inc, now, people);
        inc.assignments.stream().filter(a -> a.role == Role.DISTANT).forEach(a -> a.actions = List.of("CALL_NEARBY"));
    }

    static void autoCall(Incident inc, String now, Map<String, Person> people) {
        Person p = people.get(inc.personId);
        String number = emergencyNumber(p);
        inc.log(now, "SYSTEM", "CALLED_115", "Calling " + number + " automatically with the call script (demo call)", null,
                Params.of("number", number));
    }

    static String emergencyNumber(Person p) {
        return p != null && p.emergencyNumber != null ? p.emergencyNumber : DEFAULT_EMERGENCY_NUMBER;
    }

    static String name(Map<String, Person> people, String memberId) {
        Person p = people.get(memberId);
        return p == null ? memberId : p.displayName;
    }
}
