package com.noonealone.coreapi.model;

public class Pending {
    public String text; public String kind; public String audioPath;
    /** Which scripted question this is: OPENING, SPEECH_CHECK, SYMPTOMS or YES_NO (`kind` is how she answers: VOICE or YES_NO). */
    public String step;
}
