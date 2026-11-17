package com.noonealone.coreapi.model;

public class Turn {
    public String by; public String at; public String text; public String audioPath; public Assessment assessment;
    /** For the agent's scripted questions: OPENING, SPEECH_CHECK, SYMPTOMS or YES_NO. Absent on the person's turns. */
    public String kind;
}
