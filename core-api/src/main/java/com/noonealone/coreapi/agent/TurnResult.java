package com.noonealone.coreapi.agent;

import com.noonealone.coreapi.model.Assessment;

public record TurnResult(String transcript, Assessment assessment, Next next, boolean done, boolean fallback) {
    /** `kind` is how she answers (VOICE or YES_NO); `step` is which scripted question this is (null from an older respond-agent). */
    public record Next(String text, String kind, String audioBase64, String mimeType, String step) {
        public Next(String text, String kind, String audioBase64, String mimeType) {
            this(text, kind, audioBase64, mimeType, null);
        }
    }
}
