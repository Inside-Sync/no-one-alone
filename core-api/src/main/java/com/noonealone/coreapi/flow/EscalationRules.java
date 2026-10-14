package com.noonealone.coreapi.flow;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.noonealone.coreapi.model.Assignment;
import com.noonealone.coreapi.model.AssignmentState;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Person;
import com.noonealone.coreapi.model.Role;
import com.noonealone.coreapi.model.StoryClock;

final class EscalationRules {

    private EscalationRules() {}

    static Optional<Assignment> nextQueued(Incident inc) {
        return inc.assignments.stream()
                .filter(a -> a.role == Role.NEARBY && a.state == AssignmentState.QUEUED)
                .findFirst();
    }

    static void notify(Incident inc, Assignment a, String now, String taskName, Map<String, Person> people) {
        a.state = AssignmentState.NOTIFIED;
        a.notifiedAt = now;
        a.deadlineAt = StoryClock.plusSeconds(now, inc.demo.timerSeconds);
        inc.escalationTaskName = taskName;
        inc.log(now, "SYSTEM", "NOTIFIED", name(people, a.memberId) + " notified");
    }

    static void noNearby(Incident inc, String now) {
        inc.escalationTaskName = null;
        inc.log(now, "SYSTEM", "NO_NEARBY", "No one nearby accepted");
        inc.assignments.stream().filter(a -> a.role == Role.DISTANT)
                .forEach(a -> a.actions = List.of("CALL_NEARBY", "CALLED_115"));
    }

    static String name(Map<String, Person> people, String memberId) {
        Person p = people.get(memberId);
        return p == null ? memberId : p.displayName;
    }
}
