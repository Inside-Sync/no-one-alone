package com.noonealone.coreapi.model;

import java.util.Map;

/**
 * One line of the incident timeline. `text` is for people to read, in English. `kind` is the stable code the web
 * keys on. `memberId` is set when the line is about one circle member, and `params` holds the values that went into
 * the text (hr, etaMin, seconds ...), so a screen can write the line in its own language.
 */
public class TimelineEntry {
    public String at; public String actor; public String kind; public String text;
    public String memberId; public Map<String, Object> params;
}
