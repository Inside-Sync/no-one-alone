package com.noonealone.coreapi.model;

import java.util.List;

public class RecoveryInfo {
    // `note` is shown as is; `key` is the stable code set by core-api when the medicine is in the known list.
    public record Med(String name, String dose, List<String> times, String change, String note, String key) {
        public Med(String name, String dose, List<String> times, String change, String note) {
            this(name, dose, times, change, note, null);
        }

        public Med(String name, String dose, List<String> times, String change) {
            this(name, dose, times, change, null, null);
        }
    }

    // `reminder` replaces the template wording; `key` is the stable code set by core-api when the activity is in the known list.
    public record Activity(String text, List<String> times, String reminder, String key) {
        public Activity(String text, List<String> times, String reminder) {
            this(text, times, reminder, null);
        }

        public Activity(String text, List<String> times) {
            this(text, times, null, null);
        }
    }

    public record FollowUp(String text, Integer inDays, String date) {}

    /** `key` is the key of the medicine or activity the reminder is for, when it has one. */
    public record Reminder(String time, String kind, String text, String audioPath, String key) {
        public Reminder(String time, String kind, String text, String audioPath) {
            this(time, kind, text, audioPath, null);
        }
    }

    public String createdAt;
    public String staffName;
    public String diagnosis;
    public String notes;
    public List<Med> meds;
    public List<Activity> activities;
    public List<FollowUp> followUps;
    public String summary;
    public String summaryAudioPath;
    public List<Reminder> reminders;
    public boolean fallback;
}
