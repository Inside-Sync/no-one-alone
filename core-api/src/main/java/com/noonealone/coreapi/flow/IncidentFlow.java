package com.noonealone.coreapi.flow;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.noonealone.coreapi.agent.AgentException;
import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.agent.TurnResult;
import com.noonealone.coreapi.agent.VerifyResult;
import com.noonealone.coreapi.data.Fixture;
import com.noonealone.coreapi.data.Scenarios;
import com.noonealone.coreapi.gcp.AudioStore;
import com.noonealone.coreapi.model.Alert;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Pending;
import com.noonealone.coreapi.model.Person;
import com.noonealone.coreapi.model.Role;
import com.noonealone.coreapi.model.Status;
import com.noonealone.coreapi.model.StoryClock;
import com.noonealone.coreapi.model.Turn;
import com.noonealone.coreapi.model.Verify;
import com.noonealone.coreapi.store.IncidentStore;

@Service
public class IncidentFlow {

    static final int MAX_AGENT_TURNS = 4;

    private final IncidentStore store;
    private final RespondAgentClient agent;
    private final Scenarios scenarios;
    private final AudioStore audio;
    private final Clock clock;

    public IncidentFlow(IncidentStore store, RespondAgentClient agent, Scenarios scenarios, AudioStore audio, Clock clock) {
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
        store.mutate(incidentId, (x, now) -> {
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
        if (result.isReal()) {
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
        String agentAudio = !finish && r.next().audioBase64() != null
                ? audio.save(incidentId, agentIndex + "-agent.mp3", Base64.getDecoder().decode(r.next().audioBase64()), "audio/mpeg")
                : null;
        TurnResult result = r;
        store.mutate(incidentId, (x, now) -> {
            if (personTurn) {
                Turn t = new Turn();
                t.by = "PERSON";
                t.at = now;
                t.audioPath = personAudio;
                if (input.yesNo() != null) {
                    t.text = "YES".equals(input.yesNo()) ? "Có" : "Không";
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
                t.audioPath = agentAudio;
                x.checkIn.turns.add(t);
                x.checkIn.pending = new Pending();
                x.checkIn.pending.text = t.text;
                x.checkIn.pending.kind = result.next().kind();
                x.checkIn.pending.audioPath = agentAudio;
                if ("YES_NO".equals(result.next().kind())) {
                    x.checkIn.mode = "LARGE_TEXT";
                }
                x.log(now, "AGENT", "ASKED", t.text);
            }
            x.checkIn.busy = false;
            return true;
        });
        if (finish) {
            finishCheckIn(incidentId);
        }
    }

    void finishCheckIn(String incidentId) {
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
