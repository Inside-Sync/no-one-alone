package com.noonealone.coreapi.model;

import java.util.List;

public class Assignment {
    public String memberId;
    public Role role;
    public String message;
    public List<String> actions;
    public Integer etaMin;
    public AssignmentState state;
    public Integer attempt;
    public String notifiedAt;
    public String deadlineAt;
    public String respondedAt;
    public String arrivedAt;
}
