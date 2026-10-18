package com.noonealone.coreapi.model;

import java.util.List;

public class RecoveryInfo {
    /** `note`: optional line for the person on why they take it, written by the hospital and shown as is. */
    public record Med(String name, String dose, List<String> times, String change, String note) {
        public Med(String name, String dose, List<String> times, String change) {
            this(name, dose, times, change, null);
        }
    }

    /** `reminder`: optional wording for the timed reminder, used as is instead of the template. */
    public record Activity(String text, List<String> times, String reminder) {
        public Activity(String text, List<String> times) {
            this(text, times, null);
        }
    }

    public record FollowUp(String text, Integer inDays, String date) {}

    public record Reminder(String time, String kind, String text, String audioPath) {}

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
