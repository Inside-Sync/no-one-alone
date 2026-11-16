package com.noonealone.coreapi.flow;

import java.util.List;
import java.util.Map;

/**
 * Stable keys for the items the recovery plan form offers. A key is found by a lowercase word in the name or text, so
 * "Apixaban 5 mg" is `apixaban`. Anything a doctor types that matches none of them gets no key.
 */
final class RecoveryKeys {

    // First match wins, so "vitamin d" is checked before shorter words.
    private static final List<Map.Entry<String, String>> MEDS = List.of(
            Map.entry("apixaban", "apixaban"), Map.entry("perindopril", "perindopril"),
            Map.entry("atorvastatin", "atorvastatin"), Map.entry("amlodipine", "amlodipine"),
            Map.entry("vitamin d", "vitamin_d"), Map.entry("aspirin", "aspirin"));

    private static final List<Map.Entry<String, String>> ACTIVITIES = List.of(
            Map.entry("walk", "walk"), Map.entry("blood pressure", "blood_pressure"),
            Map.entry("speech", "speech"), Map.entry("water", "water"));

    private RecoveryKeys() {}

    static String med(String name) {
        return find(MEDS, name);
    }

    static String activity(String text) {
        return find(ACTIVITIES, text);
    }

    private static String find(List<Map.Entry<String, String>> table, String text) {
        if (text == null) {
            return null;
        }
        String t = text.toLowerCase();
        return table.stream().filter(e -> t.contains(e.getKey())).map(Map.Entry::getValue).findFirst().orElse(null);
    }
}
