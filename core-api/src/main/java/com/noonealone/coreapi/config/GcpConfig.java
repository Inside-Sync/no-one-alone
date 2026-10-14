package com.noonealone.coreapi.config;

import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.client.RestClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;

import com.google.cloud.NoCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FirestoreOptions;

@Configuration
public class GcpConfig {

    private static final Logger log = LoggerFactory.getLogger(GcpConfig.class);

    @Bean
    Firestore firestore(NoaProperties props) {
        FirestoreOptions.Builder builder = FirestoreOptions.newBuilder().setProjectId(props.projectId());
        String host = props.firestoreEmulatorHost();
        if (host != null && !host.isBlank()) {
            // setEmulatorHost leaves the channel on googleapis.com:443 when credentials are NoCredentials
            builder.setHost(host).setCredentials(NoCredentials.getInstance());
        }
        return builder.build().getService();
    }

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    Executor workExecutor() {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        return task -> pool.execute(() -> {
            try {
                task.run();
            } catch (RuntimeException e) {
                log.error("Background work failed", e);
            }
        });
    }

    @Bean
    RestClientCustomizer timeouts() {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(Duration.ofSeconds(60));
        return builder -> builder.requestFactory(factory);
    }
}
