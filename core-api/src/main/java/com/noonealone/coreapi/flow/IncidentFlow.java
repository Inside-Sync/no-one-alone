package com.noonealone.coreapi.flow;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.noonealone.coreapi.agent.AgentException;
import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.agent.TriageResult;
import com.noonealone.coreapi.agent.TurnResult;
import com.noonealone.coreapi.agent.VerifyResult;
import com.noonealone.coreapi.data.Fixture;
import com.noonealone.coreapi.data.Scenarios;
import com.noonealone.coreapi.gcp.AudioStore;
import com.noonealone.coreapi.model.Alert;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Level;
import com.noonealone.coreapi.model.Pending;
import com.noonealone.coreapi.model.Person;
import com.noonealone.coreapi.model.Role;
import com.noonealone.coreapi.model.Status;
import com.noonealone.coreapi.model.StoryClock;
import com.noonealone.coreapi.model.Triage;
import com.noonealone.coreapi.model.Turn;
import com.noonealone.coreapi.model.Verify;
import com.noonealone.coreapi.store.IncidentStore;
import com.noonealone.coreapi.web.ApiException;

@Service
public class IncidentFlow {

    private static final Logger log = LoggerFactory.getLogger(IncidentFlow.class);

    static final int MAX_AGENT_TURNS = 4;

    private final IncidentStore store;
    private final RespondAgentClient agent;
    private final Scenarios scenarios;
    private final AudioStore audio;
    private final Escalation escalation;
    private final Clock clock;

    public IncidentFlow(IncidentStore store, RespondAgentClient agent, Scenarios scenarios, AudioStore audio,
            Escalation escalation, Clock clock) {
        this.escalation = escalation;
        this.store = store;
        this.agent = agent;
        this.scenarios = scenarios;
        this.audio = audio;
        this.clock = clock;
    }

    public boolean create(AlertMessage msg) {
        String now = StoryClock.now(msg.demo().clockOffsetMs, clock);
        Incident inc = new Incident();
        inc.id = msg.alertId();
        inc.personId = msg.personId();
        inc.scenario = msg.scenario();
        inc.status = Status.VERIFYING;
        inc.version = 1;
        inc.createdAt = now;
        inc.updatedAt = now;
        inc.alert = new Alert();
        inc.alert.kind = msg.kind();
        inc.alert.at = now;
        inc.alert.hr = msg.hr();
        inc.alert.movementMin = msg.movementMin();
        inc.demo = msg.demo();
        inc.log(now, "SYSTEM", "ALERT", "HR " + msg.hr() + ", no movement " + msg.movementMin() + " min");
        return store.createIfAbsent(inc);
    }

    public void process(String incidentId) {
        Incident inc = store.get(incidentId);
        Person person = store.person(inc.personId);
        VerifyResult v;
        boolean agentDown = false;
        try {
            v = agent.verify(verifyBody(inc, person));
        } catch (AgentException e) {
            v = new VerifyResult(true, "respond-agent unavailable, alert treated as real", null, true);
            agentDown = true;
        }
        VerifyResult result = v;
        boolean down = agentDown;
        IncidentStore.Mutation m = store.mutate(incidentId, (x, now) -> {
            if (x.status != Status.VERIFYING) {
                return false;
            }
            x.verify = new Verify();
            x.verify.isReal = result.isReal();
            x.verify.reason = result.reason();
            x.verify.fallback = result.fallback();
            x.lastKnownWellAt = result.lastKnownWellAt();
            if (down) {
                x.log(now, "AGENT", "AGENT_FALLBACK", "Verify used fallback");
            }
            if (result.isReal()) {
                x.status = Status.CHECKING_IN;
                x.log(now, "AGENT", "VERIFIED", result.reason());
            } else {
                x.status = Status.CLOSED;
                x.log(now, "AGENT", "FALSE_ALARM", result.reason());
            }
            return true;
        });
        if (m.changed() && result.isReal()) {
            askNext(incidentId, null);
        }
    }

    void askNext(String incidentId, CheckInInput input) {
        Incident inc = store.get(incidentId);
        Person person = store.person(inc.personId);
        TurnResult r;
        try {
            r = agent.checkinTurn(turnBody(inc, person, input));
        } catch (AgentException e) {
            r = null;
        }
        int index = inc.checkIn.turns.size();
        boolean personTurn = input != null && input.hasPersonTurn();
        String personAudio = personTurn && input.audio() != null
                ? audio.save(incidentId, index + "-person.webm", input.audio(), input.mimeType())
                : null;
        int agentIndex = index + (personTurn ? 1 : 0);
        boolean finish = r == null || r.done() || r.next() == null || inc.agentTurnCount() >= MAX_AGENT_TURNS;
        String agentAudio = null;
        if (!finish && r.next().audioBase64() != null) {
            try {
                agentAudio = audio.save(incidentId, agentIndex + "-agent.mp3",
                        Base64.getDecoder().decode(r.next().audioBase64()), "audio/mpeg");
            } catch (RuntimeException e) {
                log.warn("Agent audio not saved for incident {}: {}", incidentId, e.getClass().getSimpleName());
            }
        }
        String savedAgentAudio = agentAudio;
        TurnResult result = r;
        IncidentStore.Mutation m = store.mutate(incidentId, (x, now) -> {
            if (x.status != Status.CHECKING_IN) {
                return false;
            }
            if (personTurn) {
                Turn t = new Turn();
                t.by = "PERSON";
                t.at = now;
                t.audioPath = personAudio;
                if (input.yesNo() != null) {
                    boolean en = person.locale != null && person.locale.startsWith("en");
                    t.text = "YES".equals(input.yesNo()) ? (en ? "Yes" : "Có") : (en ? "No" : "Không");
                } else if (result != null) {
                    t.text = result.transcript();
                    t.assessment = result.assessment();
                }
                x.checkIn.turns.add(t);
                x.log(now, "PERSON", "ANSWERED", t.text == null ? "No speech" : t.text);
            }
            if (result == null) {
                x.log(now, "AGENT", "AGENT_FALLBACK", "Check-in used fallback");
            }
            if (finish) {
                x.checkIn.pending = null;
                x.checkIn.done = true;
            } else {
                Turn t = new Turn();
                t.by = "AGENT";
                t.at = now;
                t.text = result.next().text();
                t.audioPath = savedAgentAudio;
                x.checkIn.turns.add(t);
                x.checkIn.pending = new Pending();
                x.checkIn.pending.text = t.text;
                x.checkIn.pending.kind = result.next().kind();
                x.checkIn.pending.audioPath = savedAgentAudio;
                if ("YES_NO".equals(result.next().kind())) {
                    x.checkIn.mode = "LARGE_TEXT";
                }
                x.log(now, "AGENT", "ASKED", t.text);
            }
            x.checkIn.busy = false;
            return true;
        });
        if (finish && m.changed()) {
            finishCheckIn(incidentId);
        }
    }

    public void acceptCheckIn(String incidentId, CheckInInput input) {
        int kinds = (input.audio() != null ? 1 : 0) + (input.yesNo() != null ? 1 : 0) + (input.noReply() ? 1 : 0);
        if (kinds != 1) {
            throw ApiException.badRequest("Send exactly one of audio, yesNo or noReply");
        }
        if (input.yesNo() != null && !List.of("YES", "NO").contains(input.yesNo())) {
            throw ApiException.badRequest("yesNo must be YES or NO");
        }
        store.mutate(incidentId, (x, now) -> {
            if (x.status != Status.CHECKING_IN || x.checkIn.done || x.checkIn.busy
                    || x.checkIn.pending == null) {
                throw ApiException.invalidState("Check-in is not waiting for an answer");
            }
            x.checkIn.busy = true;
            x.checkIn.pending = null;
            if (input.noReply()) {
                x.checkIn.noReplyCount++;
                x.log(now, "PERSON", "NO_REPLY", "No reply");
            }
            return true;
        });
    }

    public void processCheckIn(String incidentId, CheckInInput input) {
        try {
            Incident inc = store.get(incidentId);
            if (input.noReply() && inc.checkIn.noReplyCount >= 2) {
                store.mutate(incidentId, (x, now) -> {
                    x.checkIn.done = true;
                    x.checkIn.busy = false;
                    return true;
                });
                finishCheckIn(incidentId);
                return;
            }
            askNext(incidentId, input);
        } catch (RuntimeException e) {
            store.mutate(incidentId, (x, now) -> {
                if (!x.checkIn.busy) {
                    return false;
                }
                x.checkIn.busy = false;
                return true;
            });
            throw e;
        }
    }

    void finishCheckIn(String incidentId) {
        Incident inc = store.get(incidentId);
        TriageResult r;
        try {
            r = agent.triage(triageBody(inc));
        } catch (AgentException e) {
            r = new TriageResult(fallbackLevel(inc), List.of("respond-agent unavailable"), true);
        }
        TriageResult result = r;
        IncidentStore.Mutation m = store.mutate(incidentId, (x, now) -> {
            if (x.level != null || x.status != Status.CHECKING_IN) {
                return false;
            }
            x.level = result.level();
            x.triage = new Triage();
            x.triage.reasons = result.reasons();
            x.triage.fallback = result.fallback();
            if (result.fallback()) {
                x.log(now, "AGENT", "AGENT_FALLBACK", "Triage used fallback");
            }
            x.log(now, "AGENT", "TRIAGED", "Level " + result.level() + ": " + String.join(", ", result.reasons()));
            if (result.level() == Level.OK || result.level() == Level.MONITOR) {
                x.status = Status.CLOSED;
                x.log(now, "SYSTEM", "CLOSED", "Closed after check-in");
            }
            return true;
        });
        if (m.changed() && (result.level() == Level.COME_NOW || result.level() == Level.EMERGENCY)) {
            escalation.start(incidentId);
        }
    }

    static Level fallbackLevel(Incident inc) {
        return inc.hasSlurredTurn() ? Level.EMERGENCY : Level.COME_NOW;
    }

    private Map<String, Object> triageBody(Incident inc) {
        List<Map<String, Object>> turns = new ArrayList<>();
        for (Turn t : inc.checkIn.turns) {
            Map<String, Object> m = new HashMap<>();
            m.put("by", t.by);
            m.put("text", t.text);
            if (t.assessment != null) {
                m.put("assessment", t.assessment);
            }
            turns.add(m);
        }
        Map<String, Object> alert = new HashMap<>();
        alert.put("kind", inc.alert.kind);
        alert.put("hr", inc.alert.hr);
        return Map.of("alert", alert, "verify", Map.of("isReal", true), "turns", turns,
                "noReplyCount", inc.checkIn.noReplyCount);
    }

    private Map<String, Object> verifyBody(Incident inc, Person person) {
        Fixture f = scenarios.get(inc.scenario);
        Instant alertAt = Instant.parse(inc.alert.at);
        List<Map<String, Object>> window = new ArrayList<>();
        for (Fixture.WindowPoint p : f.window()) {
            window.add(Map.of("at", alertAt.minusSeconds(60L * p.minutesBefore()).toString(),
                    "hr", p.hr(), "steps", p.steps(), "moving", p.moving()));
        }
        Map<String, Object> alert = new HashMap<>();
        alert.put("kind", inc.alert.kind);
        alert.put("at", inc.alert.at);
        alert.put("hr", inc.alert.hr);
        alert.put("movementMin", inc.alert.movementMin);
        return Map.of("person", Map.of("age", person.age, "baseline", person.baseline),
                "alert", alert, "window", window);
    }

    private Map<String, Object> turnBody(Incident inc, Person person, CheckInInput input) {
        Map<String, Object> p = new HashMap<>();
        p.put("displayName", person.displayName);
        p.put("dialect", person.dialect);
        p.put("locale", person.locale);
        p.put("accessibility", person.accessibility);
        person.circle.stream().filter(c -> c.role == Role.DISTANT && c.criticalAlerts).findFirst()
                .ifPresent(c -> {
                    p.put("callerName", store.person(c.memberId).displayName);
                    p.put("callerRelation", c.relation);
                });
        List<Map<String, Object>> turns = new ArrayList<>();
        for (Turn t : inc.checkIn.turns) {
            Map<String, Object> m = new HashMap<>();
            m.put("by", t.by);
            m.put("text", t.text);
            if (t.assessment != null) {
                m.put("assessment", t.assessment);
            }
            turns.add(m);
        }
        Map<String, Object> body = new HashMap<>();
        body.put("incidentId", inc.id);
        body.put("person", p);
        body.put("turns", turns);
        body.put("noReplyCount", inc.checkIn.noReplyCount);
        if (input != null) {
            if (input.audio() != null) {
                body.put("input", Map.of("audioBase64", Base64.getEncoder().encodeToString(input.audio()),
                        "mimeType", input.mimeType()));
            } else if (input.yesNo() != null) {
                body.put("input", Map.of("yesNo", input.yesNo()));
            } else {
                body.put("input", Map.of("noReply", true));
            }
        }
        return body;
    }
}
