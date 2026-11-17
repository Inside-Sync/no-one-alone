package com.noonealone.coreapi.agent;

import java.util.List;

public record RecoveryResult(String summary, String summaryAudioBase64, List<Reminder> reminders, boolean fallback) {
    public record Reminder(String time, String kind, String text, String audioBase64, String key) {
        public Reminder(String time, String kind, String text, String audioBase64) {
            this(time, kind, text, audioBase64, null);
        }
    }
}
