package com.noonealone.coreapi.model;

import java.util.ArrayList;
import java.util.List;

public class CheckIn {
    public String mode = "VOICE";
    public int noReplyCount;
    public boolean busy;
    public boolean done;
    public Pending pending;
    public List<Turn> turns = new ArrayList<>();
}
