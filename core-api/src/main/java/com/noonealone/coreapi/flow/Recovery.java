package com.noonealone.coreapi.flow;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;

import com.noonealone.coreapi.agent.AgentException;
import com.noonealone.coreapi.agent.RecoveryResult;
import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.gcp.AudioStore;
import com.noonealone.coreapi.gcp.EscalationTimers;
import com.noonealone.coreapi.model.Docs;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Person;
import com.noonealone.coreapi.model.RecoveryInfo;
import com.noonealone.coreapi.model.RecoveryInfo.Activity;
import com.noonealone.coreapi.model.RecoveryInfo.FollowUp;
import com.noonealone.coreapi.model.RecoveryInfo.Med;
import com.noonealone.coreapi.model.RecoveryInfo.Reminder;
import com.noonealone.coreapi.model.Status;
import com.noonealone.coreapi.store.IncidentStore;
import com.noonealone.coreapi.web.ApiException;

@Service
public class Recovery {

    public record Plan(String staffName, String diagnosis, List<Med> meds, List<Activity> activities,
            List<FollowUp> followUps, String notes) {
        public Plan {
            meds = meds == null ? List.of() : meds;
            activities = activities == null ? List.of() : activities;
            followUps = followUps == null ? List.of() : followUps;
        }
    }

    private static final Pattern TIME = Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");
    private static final int MAX_TEXT = 300;

    private final IncidentStore store;
    private final RespondAgentClient agent;
    private final AudioStore audio;
    private final EscalationTimers tasks;

    public Recovery(IncidentStore store, RespondAgentClient agent, AudioStore audio, EscalationTimers tasks) {
        this.store = store;
        this.agent = agent;
        this.audio = audio;
        this.tasks = tasks;
    }

    public long discharge(String incidentId, Plan plan) {
        validate(plan);
        Incident inc = store.get(incidentId);
        requireOpen(inc);
        Person person = store.person(inc.personId);

        RecoveryResult result;
        try {
            result = agent.recovery(Map.of(
                    "person", Map.of("displayName", person.displayName, "locale", person.locale, "timezone", person.timezone),
                    "plan", Docs.toMap(plan)));
        } catch (AgentException e) {
            result = new RecoveryResult(plan.notes(), null, fallbackReminders(plan, isEnglish(person)), true);
        }
        if (malformed(result)) {
            result = new RecoveryResult(plan.notes(), null, fallbackReminders(plan, isEnglish(person)), true);
        }
        List<RecoveryResult.Reminder> sorted = result.reminders().stream()
                .sorted(Comparator.comparing(RecoveryResult.Reminder::time)).toList();
        List<Reminder> reminders = new ArrayList<>();
        for (int i = 0; i < sorted.size(); i++) {
            RecoveryResult.Reminder r = sorted.get(i);
            reminders.add(new Reminder(r.time(), r.kind(), r.text(), saveAudio(incidentId, "recovery-" + i + ".mp3", r.audioBase64())));
        }
        String summaryAudio = saveAudio(incidentId, "recovery-summary.mp3", result.summaryAudioBase64());

        RecoveryResult r = result;
        IncidentStore.Mutation m = store.mutate(incidentId, (x, now) -> {
            requireOpen(x);
            LocalDate today = Instant.parse(now).atZone(ZoneId.of(person.timezone)).toLocalDate();
            RecoveryInfo info = new RecoveryInfo();
            info.createdAt = now;
            info.staffName = plan.staffName();
            info.diagnosis = plan.diagnosis();
            info.notes = plan.notes();
            info.meds = plan.meds();
            info.activities = plan.activities();
            info.followUps = plan.followUps().stream()
                    .map(f -> new FollowUp(f.text(), f.inDays(), today.plusDays(f.inDays()).toString())).toList();
            info.summary = r.summary();
            info.summaryAudioPath = summaryAudio;
            info.reminders = reminders;
            info.fallback = r.fallback();
            x.recovery = info;
            x.status = Status.CLOSED;
            x.log(now, "HOSPITAL", "DISCHARGED", "Discharged home with a recovery plan by " + plan.staffName());
            return true;
        });
        tasks.deleteQuietly(m.incident().escalationTaskName);
        return m.incident().version;
    }

    private String saveAudio(String incidentId, String fileName, String base64) {
        if (base64 == null) {
            return null;
        }
        try {
            return audio.save(incidentId, fileName, Base64.getDecoder().decode(base64), "audio/mpeg");
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static boolean malformed(RecoveryResult r) {
        return r.reminders() == null || r.reminders().stream().anyMatch(x -> x == null || x.time() == null || x.text() == null);
    }

    private static void requireOpen(Incident inc) {
        if (inc.handoff == null) {
            throw ApiException.invalidState("Incident has no hospital handoff");
        }
        if (inc.recovery != null) {
            throw ApiException.invalidState("Recovery plan already exists");
        }
    }

    private static boolean isEnglish(Person p) {
        return p.locale != null && p.locale.toLowerCase().startsWith("en");
    }

    private static List<RecoveryResult.Reminder> fallbackReminders(Plan plan, boolean en) {
        Stream<RecoveryResult.Reminder> meds = plan.meds().stream().flatMap(m -> m.times().stream()
                .map(t -> new RecoveryResult.Reminder(t, "MED", en
                        ? "Time for your " + m.name() + ", " + m.dose() + "."
                        : "Mạ ơi, tới giờ uống " + m.name() + " " + m.dose() + " rồi.", null)));
        Stream<RecoveryResult.Reminder> activities = plan.activities().stream().flatMap(a -> a.times().stream()
                .map(t -> new RecoveryResult.Reminder(t, "ACTIVITY", en
                        ? "Time to " + lowerFirst(a.text()) + "."
                        : "Mạ ơi, tới giờ " + lowerFirst(a.text()) + " rồi.", null)));
        return Stream.concat(meds, activities).toList();
    }

    private static String lowerFirst(String s) {
        return Character.toLowerCase(s.charAt(0)) + s.substring(1);
    }

    private static void validate(Plan p) {
        if (p == null || blank(p.staffName())) {
            throw ApiException.badRequest("staffName is required");
        }
        if (p.meds().isEmpty() && p.activities().isEmpty()) {
            throw ApiException.badRequest("meds and activities cannot both be empty");
        }
        if (p.meds().size() > 10 || p.activities().size() > 10 || p.followUps().size() > 5) {
            throw ApiException.badRequest("Too many meds, activities or follow-ups");
        }
        text(p.staffName(), p.diagnosis(), p.notes());
        for (Med m : p.meds()) {
            if (blank(m.name()) || blank(m.dose())) {
                throw ApiException.badRequest("Each medicine needs a name and a dose");
            }
            text(m.name(), m.dose());
            times(m.times());
        }
        for (Activity a : p.activities()) {
            if (blank(a.text())) {
                throw ApiException.badRequest("Each activity needs text");
            }
            text(a.text());
            times(a.times());
        }
        for (FollowUp f : p.followUps()) {
            if (blank(f.text()) || f.inDays() == null || f.inDays() < 1 || f.inDays() > 365) {
                throw ApiException.badRequest("Each follow-up needs text and inDays from 1 to 365");
            }
            text(f.text());
        }
    }

    private static void times(List<String> times) {
        if (times == null || times.stream().anyMatch(t -> t == null || !TIME.matcher(t).matches())) {
            throw ApiException.badRequest("Times must be HH:mm");
        }
    }

    private static void text(String... values) {
        for (String v : values) {
            if (v != null && v.length() > MAX_TEXT) {
                throw ApiException.badRequest("Text is longer than " + MAX_TEXT + " characters");
            }
        }
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
