package com.noonealone.coreapi.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;

public class Incident {
    @JsonIgnore public String id;
    public String personId;
    public Scenario scenario;
    public Status status;
    public Level level;
    public long version;
    public String createdAt;
    public String updatedAt;
    public Alert alert;
    public String lastKnownWellAt;
    public Verify verify;
    public CheckIn checkIn = new CheckIn();
    public Triage triage;
    public PersonInstruction personInstruction;
    public List<Assignment> assignments = new ArrayList<>();
    @JsonInclude(JsonInclude.Include.ALWAYS) public String ownerId;
    public String escalationTaskName;
    public String callScript;
    public HandoffInfo handoff;
    public RecoveryInfo recovery;
    public List<TimelineEntry> timeline = new ArrayList<>();
    public DemoSettings demo = new DemoSettings();

    public Optional<Assignment> assignment(String memberId) {
        return assignments.stream().filter(a -> a.memberId.equals(memberId)).findFirst();
    }

    public void log(String at, String actor, String kind, String text) {
        TimelineEntry entry = new TimelineEntry();
        entry.at = at;
        entry.actor = actor;
        entry.kind = kind;
        entry.text = text;
        timeline.add(entry);
    }

    public boolean hasSlurredTurn() {
        return checkIn.turns.stream().anyMatch(t -> t.assessment != null && "SLURRED".equals(t.assessment.clarity));
    }

    public boolean suspectedStroke() {
        return hasSlurredTurn() || (triage != null && triage.reasons != null && triage.reasons.contains("weakness"));
    }

    public long agentTurnCount() {
        return checkIn.turns.stream().filter(t -> "AGENT".equals(t.by)).count();
    }
}
