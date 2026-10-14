package com.noonealone.coreapi.agent;

import com.noonealone.coreapi.model.Assessment;

public record TurnResult(String transcript, Assessment assessment, Next next, boolean done, boolean fallback) {
    public record Next(String text, String kind, String audioBase64, String mimeType) {}
}
