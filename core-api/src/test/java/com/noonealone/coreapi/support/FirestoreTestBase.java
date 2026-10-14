package com.noonealone.coreapi.support;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.FirestoreEmulatorContainer;
import org.testcontainers.utility.DockerImageName;

public abstract class FirestoreTestBase {

    public static final String PROJECT = "noa-test";

    static final FirestoreEmulatorContainer FIRESTORE = new FirestoreEmulatorContainer(
            DockerImageName.parse("gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators"));

    static {
        FIRESTORE.start();
    }

    @DynamicPropertySource
    static void firestore(DynamicPropertyRegistry registry) {
        registry.add("noa.firestore-emulator-host", FIRESTORE::getEmulatorEndpoint);
        registry.add("noa.project-id", () -> PROJECT);
    }

    @BeforeEach
    void clearFirestore() throws Exception {
        URI uri = URI.create("http://" + FIRESTORE.getEmulatorEndpoint()
                + "/emulator/v1/projects/" + PROJECT + "/databases/(default)/documents");
        HttpClient.newHttpClient().send(HttpRequest.newBuilder(uri).DELETE().build(),
                HttpResponse.BodyHandlers.discarding());
    }
}
