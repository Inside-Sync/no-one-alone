package com.noonealone.coreapi.agent;

import java.util.List;

import com.noonealone.coreapi.model.Level;

public record TriageResult(Level level, List<String> reasons, boolean fallback, Closing closing) {
    public record Closing(String text, String audioBase64) {}

    public TriageResult(Level level, List<String> reasons, boolean fallback) {
        this(level, reasons, fallback, null);
    }
}
