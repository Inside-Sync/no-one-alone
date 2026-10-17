package com.noonealone.coreapi.flow;

import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.noonealone.coreapi.gcp.EscalationTimers;
import com.noonealone.coreapi.model.Assignment;
import com.noonealone.coreapi.model.AssignmentState;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Level;
import com.noonealone.coreapi.model.Person;
import com.noonealone.coreapi.model.Role;
import com.noonealone.coreapi.model.Status;
import com.noonealone.coreapi.store.IncidentStore;
import com.noonealone.coreapi.web.ApiException;

@Service
public class Actions {

    private final IncidentStore store;
    private final EscalationTimers tasks;
    private final Handoff handoff;

    public Actions(IncidentStore store, EscalationTimers tasks, Handoff handoff) {
        this.store = store;
        this.tasks = tasks;
        this.handoff = handoff;
    }

    public long apply(String incidentId, String memberId, String action) {
        return switch (action) {
            case "ACCEPT" -> accept(incidentId, memberId);
            case "DECLINE" -> decline(incidentId, memberId);
            case "ARRIVED" -> arrived(incidentId, memberId);
            case "CALLED_115" -> called115(incidentId, memberId);
            case "CLOSE" -> close(incidentId, memberId);
            default -> throw ApiException.badRequest("Unknown action " + action);
        };
    }

    public void timeout(String incidentId, String memberId, int attempt) {
        Optional<Incident> found = store.find(incidentId);
        if (Handoff.TASK_MEMBER.equals(memberId)) {
            if (found.isPresent() && found.get().status != Status.CLOSED) {
                handoff.start(incidentId);
            }
            return;
        }
        if (found.isEmpty() || !timedOut(found.get(), memberId)) {
            return;
        }
        Incident inc = found.get();
        Map<String, Person> people = store.people();
        Optional<Assignment> next = nextAfter(inc, memberId);
        String nextTask = next.map(a -> tasks.schedule(incidentId, a.memberId, 1, inc.demo.timerSeconds)).orElse(null);
        store.mutate(incidentId, (x, now) -> {
            if (!timedOut(x, memberId)) {
                return false;
            }
            Assignment a = x.assignment(memberId).orElseThrow();
            a.state = AssignmentState.EXPIRED;
            x.log(now, "SYSTEM", "EXPIRED", EscalationRules.name(people, memberId)
                    + " did not answer in " + x.demo.timerSeconds + " s" + (a.role == Role.DISTANT ? " · voicemail and text sent" : ""));
            notifyNextOrGiveUp(x, now, nextTask, people);
            return true;
        });
        handoff.afterCall(incidentId);
    }

    private long accept(String incidentId, String memberId) {
        Map<String, Person> people = store.people();
        IncidentStore.Mutation m = store.mutate(incidentId, (x, now) -> {
            if (memberId.equals(x.ownerId)) {
                return false;
            }
            if (x.ownerId != null) {
                throw ApiException.conflict("ALREADY_OWNED",
                        EscalationRules.name(people, x.ownerId) + " is already on the way");
            }
            requireStatus(x, Status.ESCALATING);
            Assignment a = x.assignment(memberId)
                    .filter(as -> as.role == Role.NEARBY)
                    .filter(as -> as.state == AssignmentState.NOTIFIED || as.state == AssignmentState.EXPIRED)
                    .orElseThrow(() -> ApiException.invalidState(memberId + " cannot accept now"));
            a.state = AssignmentState.ACCEPTED;
            a.respondedAt = now;
            x.ownerId = memberId;
            x.log(now, memberId, "ACCEPTED", EscalationRules.name(people, memberId) + " accepted");
            if (x.level == Level.EMERGENCY && x.timeline.stream()
                    .noneMatch(t -> "SYSTEM".equals(t.actor) && "CALLED_115".equals(t.kind))) {
                EscalationRules.autoCall(x, now, people);
            }
            return true;
        });
        if (m.changed()) {
            tasks.deleteQuietly(m.incident().escalationTaskName);
            handoff.afterCall(incidentId);
        }
        return m.incident().version;
    }

    private long decline(String incidentId, String memberId) {
        Incident inc = store.get(incidentId);
        boolean canDecline = inc.status == Status.ESCALATING && inc.assignment(memberId)
                .map(a -> a.role == Role.NEARBY && a.state == AssignmentState.NOTIFIED).orElse(false);
        if (!canDecline) {
            throw ApiException.invalidState(memberId + " cannot decline now");
        }
        Map<String, Person> people = store.people();
        Optional<Assignment> next = inc.ownerId == null ? nextAfter(inc, memberId) : Optional.empty();
        String nextTask = next.map(a -> tasks.schedule(incidentId, a.memberId, 1, inc.demo.timerSeconds)).orElse(null);
        IncidentStore.Mutation m = store.mutate(incidentId, (x, now) -> {
            requireStatus(x, Status.ESCALATING);
            Assignment a = x.assignment(memberId)
                    .filter(as -> as.role == Role.NEARBY && as.state == AssignmentState.NOTIFIED)
                    .orElseThrow(() -> ApiException.invalidState(memberId + " cannot decline now"));
            a.state = AssignmentState.DECLINED;
            a.respondedAt = now;
            x.log(now, memberId, "DECLINED", EscalationRules.name(people, memberId) + " cannot go");
            if (x.ownerId == null) {
                notifyNextOrGiveUp(x, now, nextTask, people);
            }
            return true;
        });
        tasks.deleteQuietly(tasks.taskName(incidentId, memberId, 1));
        handoff.afterCall(incidentId);
        return m.incident().version;
    }

    private long arrived(String incidentId, String memberId) {
        Map<String, Person> people = store.people();
        return store.mutate(incidentId, (x, now) -> {
            requireStatus(x, Status.ESCALATING);
            if (!memberId.equals(x.ownerId)) {
                throw ApiException.invalidState("Only the member on the way can mark arrival");
            }
            Assignment a = x.assignment(memberId).orElseThrow();
            a.state = AssignmentState.ARRIVED;
            a.arrivedAt = now;
            x.status = Status.ON_SCENE;
            x.log(now, memberId, "ARRIVED", EscalationRules.name(people, memberId) + " arrived");
            return true;
        }).incident().version;
    }

    private long called115(String incidentId, String memberId) {
        Map<String, Person> people = store.people();
        return store.mutate(incidentId, (x, now) -> {
            x.assignment(memberId).filter(a -> a.state != AssignmentState.QUEUED)
                    .orElseThrow(() -> ApiException.invalidState(memberId + " has not been notified"));
            Person older = people.get(x.personId);
            String number = older != null && older.emergencyNumber != null ? older.emergencyNumber : "115";
            x.log(now, memberId, "CALLED_115", EscalationRules.name(people, memberId) + " called " + number);
            return true;
        }).incident().version;
    }

    private long close(String incidentId, String memberId) {
        if (!"console".equals(memberId)) {
            throw ApiException.invalidState("Only the demo console can close an incident");
        }
        IncidentStore.Mutation m = store.mutate(incidentId, (x, now) -> {
            if (x.status == Status.CLOSED) {
                throw ApiException.invalidState("Incident is already closed");
            }
            x.status = Status.CLOSED;
            x.log(now, "SYSTEM", "CLOSED", "Closed from the demo console");
            return true;
        });
        tasks.deleteQuietly(m.incident().escalationTaskName);
        tasks.deleteQuietly(tasks.taskName(incidentId, Handoff.TASK_MEMBER, 1));
        return m.incident().version;
    }

    private static boolean timedOut(Incident inc, String memberId) {
        return inc.status == Status.ESCALATING && inc.ownerId == null
                && inc.assignment(memberId).map(a -> a.state == AssignmentState.NOTIFIED).orElse(false);
    }

    private static Optional<Assignment> nextAfter(Incident inc, String memberId) {
        return inc.assignments.stream()
                .filter(a -> a.state == AssignmentState.QUEUED && !a.memberId.equals(memberId))
                .findFirst();
    }

    private static void notifyNextOrGiveUp(Incident x, String now, String nextTask, Map<String, Person> people) {
        Optional<Assignment> next = EscalationRules.nextQueued(x);
        if (next.isPresent() && nextTask != null) {
            EscalationRules.notify(x, next.get(), now, nextTask, people);
        } else {
            EscalationRules.noNearby(x, now, people);
        }
    }

    private static void requireStatus(Incident x, Status status) {
        if (x.status != status) {
            throw ApiException.invalidState("Incident is " + x.status);
        }
    }
}
