package com.noonealone.coreapi.flow;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;

import com.noonealone.coreapi.model.Person;

class RecoveryKeysTest {

    @Test
    void knownMedicinesAreFoundByWordWhateverTheCaseOrDose() {
        assertThat(RecoveryKeys.med("Apixaban 5 mg")).isEqualTo("apixaban");
        assertThat(RecoveryKeys.med("vitamin D3")).isEqualTo("vitamin_d");
        assertThat(RecoveryKeys.med("ASPIRIN")).isEqualTo("aspirin");
        assertThat(RecoveryKeys.med("Cod liver oil")).isNull();
        assertThat(RecoveryKeys.med(null)).isNull();
    }

    @Test
    void knownActivitiesAreFoundByWord() {
        assertThat(RecoveryKeys.activity("Walk for 15 minutes")).isEqualTo("walk");
        assertThat(RecoveryKeys.activity("Check your blood pressure")).isEqualTo("blood_pressure");
        assertThat(RecoveryKeys.activity("Speech exercises")).isEqualTo("speech");
        assertThat(RecoveryKeys.activity("Drink water")).isEqualTo("water");
        assertThat(RecoveryKeys.activity("Do the crossword")).isNull();
    }

    @Test
    void theScriptLastSeenWellIsOneTwentyTwoOnTheSameLocalDay() {
        Person moza = new Person();
        moza.timezone = "Asia/Dubai";

        String iso = Handoff.scriptLastWell("2026-10-15T21:55:00Z", moza);

        assertThat(Instant.parse(iso).atZone(ZoneId.of("Asia/Dubai")).toLocalTime().toString()).isEqualTo("01:22");
        assertThat(Instant.parse(iso).atZone(ZoneId.of("Asia/Dubai")).toLocalDate().toString()).isEqualTo("2026-10-16");
    }

    @Test
    void aPersonSpeaksArabicOnlyWithAnArabicLocale() {
        Person p = new Person();
        assertThat(p.language()).isEqualTo("en");
        p.locale = "en-AE";
        assertThat(p.language()).isEqualTo("en");
        p.locale = "ar-AE";
        assertThat(p.language()).isEqualTo("ar");
        p.locale = "fr-FR";
        assertThat(p.language()).isEqualTo("en");
    }
}
