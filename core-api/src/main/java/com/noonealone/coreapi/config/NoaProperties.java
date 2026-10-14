package com.noonealone.coreapi.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("noa")
public record NoaProperties(
        String projectId,
        String region,
        String firestoreEmulatorHost,
        Agent respondAgent,
        Tasks tasks,
        PubSub pubsub,
        Audio audio,
        Maps maps,
        Auth auth) {

    public record Agent(String url, boolean auth) {}

    public record Tasks(boolean enabled, String queue, String targetUrl, String invokerEmail) {}

    public record PubSub(boolean enabled, String topic) {}

    public record Audio(boolean enabled, String bucket) {}

    public record Maps(String apiKey) {}

    public record Auth(boolean enabled, String audience, String invokerEmail) {}
}
