package com.noonealone.coreapi.model;

import java.util.Map;

// One timeline line: English `text`, stable `kind`, and `memberId`/`params` so a screen can write it in its own language.
public class TimelineEntry {
    public String at; public String actor; public String kind; public String text;
    public String memberId; public Map<String, Object> params;
}
