package com.noonealone.coreapi.gcp;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Instant;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.google.api.gax.rpc.AlreadyExistsException;
import com.google.cloud.tasks.v2.CloudTasksClient;
import com.google.cloud.tasks.v2.HttpMethod;
import com.google.cloud.tasks.v2.HttpRequest;
import com.google.cloud.tasks.v2.OidcToken;
import com.google.cloud.tasks.v2.QueueName;
import com.google.cloud.tasks.v2.Task;
import com.google.protobuf.ByteString;
import com.google.protobuf.Timestamp;
import com.noonealone.coreapi.config.NoaProperties;
import com.noonealone.coreapi.model.Docs;

@Component
public class EscalationTimers {

    private static final Logger log = LoggerFactory.getLogger(EscalationTimers.class);

    private final NoaProperties.Tasks config;
    private final QueueName queue;
    private final CloudTasksClient client;

    public EscalationTimers(NoaProperties props) {
        this.config = props.tasks();
        this.queue = QueueName.of(props.projectId(), props.region(), config.queue());
        try {
            this.client = config.enabled() ? CloudTasksClient.create() : null;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public boolean enabled() {
        return config.enabled();
    }

    public String taskName(String incidentId, String memberId, int attempt) {
        return queue + "/tasks/" + incidentId + "-" + memberId + "-" + attempt;
    }

    public String schedule(String incidentId, String memberId, int attempt, int delaySeconds) {
        String name = taskName(incidentId, memberId, attempt);
        if (!config.enabled()) {
            log.info("Cloud Tasks disabled; not scheduling {}", name);
            return name;
        }
        Instant at = Instant.now().plusSeconds(delaySeconds);
        Task task = Task.newBuilder()
                .setName(name)
                .setScheduleTime(Timestamp.newBuilder().setSeconds(at.getEpochSecond()))
                .setHttpRequest(HttpRequest.newBuilder()
                        .setUrl(config.targetUrl() + "/tasks/escalation-timeout")
                        .setHttpMethod(HttpMethod.POST)
                        .putHeaders("Content-Type", "application/json")
                        .setBody(ByteString.copyFrom(json(Map.of("incidentId", incidentId, "memberId", memberId, "attempt", attempt))))
                        .setOidcToken(OidcToken.newBuilder()
                                .setServiceAccountEmail(config.invokerEmail())
                                .setAudience(config.targetUrl())))
                .build();
        try {
            client.createTask(queue, task);
        } catch (AlreadyExistsException e) {
            log.info("Task {} already exists", name);
        }
        return name;
    }

    public void deleteQuietly(String name) {
        if (!config.enabled() || name == null) {
            return;
        }
        try {
            client.deleteTask(name);
        } catch (RuntimeException e) {
            log.debug("Task {} not deleted: {}", name, e.getMessage());
        }
    }

    private static byte[] json(Object value) {
        try {
            return Docs.mapper().writeValueAsBytes(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }
}
