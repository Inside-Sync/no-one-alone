package com.noonealone.coreapi.store;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import com.noonealone.coreapi.data.Seed;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Status;
import com.noonealone.coreapi.support.FirestoreTestBase;
import com.noonealone.coreapi.support.FixedClockConfig;
import com.noonealone.coreapi.web.ApiException;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import(FixedClockConfig.class)
class IncidentStoreTest extends FirestoreTestBase {

    @Autowired IncidentStore store;
    @Autowired Seed seed;

    private Incident incident(String id) {
        Incident i = new Incident();
        i.id = id;
        i.personId = "ba-mai";
        i.status = Status.VERIFYING;
        i.version = 1;
        i.demo.clockOffsetMs = -151020000L;
        return i;
    }

    @Test
    void createIfAbsentCreatesOnce() {
        assertThat(store.createIfAbsent(incident("a-1"))).isTrue();
        assertThat(store.createIfAbsent(incident("a-1"))).isFalse();
    }

    @Test
    void mutateBumpsVersionAndWritesStoryTime() {
        store.createIfAbsent(incident("a-2"));

        IncidentStore.Mutation m = store.mutate("a-2", (inc, now) -> {
            inc.status = Status.CHECKING_IN;
            return true;
        });

        Incident saved = store.get("a-2");
        assertThat(m.changed()).isTrue();
        assertThat(saved.version).isEqualTo(2);
        assertThat(saved.status).isEqualTo(Status.CHECKING_IN);
        assertThat(saved.updatedAt).isEqualTo("2026-10-15T19:03:00Z");
    }

    @Test
    void unchangedMutationDoesNotWrite() {
        store.createIfAbsent(incident("a-3"));

        IncidentStore.Mutation m = store.mutate("a-3", (inc, now) -> false);

        assertThat(m.changed()).isFalse();
        assertThat(store.get("a-3").version).isEqualTo(1);
    }

    @Test
    void apiExceptionFromChangeIsRethrownUnwrapped() {
        store.createIfAbsent(incident("a-4"));

        assertThatThrownBy(() -> store.mutate("a-4", (inc, now) -> {
            throw ApiException.invalidState("nope");
        })).isInstanceOf(ApiException.class).hasMessage("nope");
    }

    @Test
    void seedLoadsPeopleAndHospitals() {
        store.seed(seed.data());

        assertThat(store.person("ba-mai").displayName).isEqualTo("Bà Mai");
        assertThat(store.person("ba-mai").id).isEqualTo("ba-mai");
        assertThat(store.hospitals()).hasSize(4);
    }
}
