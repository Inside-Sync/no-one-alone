package com.noonealone.coreapi.agent;

import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.noonealone.coreapi.config.NoaProperties;

@Component
public class RespondAgentClient {

    private final RestClient http;

    public RespondAgentClient(NoaProperties props, RestClient.Builder builder) {
        builder.baseUrl(props.respondAgent().url());
        if (props.respondAgent().auth()) {
            builder.requestInterceptor(new IdTokenInterceptor(props.respondAgent().url()));
        }
        this.http = builder.build();
    }

    public VerifyResult verify(Map<String, Object> body) {
        return post("/verify", body, VerifyResult.class);
    }

    public TurnResult checkinTurn(Map<String, Object> body) {
        return post("/checkin/turn", body, TurnResult.class);
    }

    public TriageResult triage(Map<String, Object> body) {
        return post("/triage", body, TriageResult.class);
    }

    public PlanResult plan(Map<String, Object> body) {
        return post("/plan", body, PlanResult.class);
    }

    public HandoffResult handoff(Map<String, Object> body) {
        return post("/handoff", body, HandoffResult.class);
    }

    public RecoveryResult recovery(Map<String, Object> body) {
        return post("/recovery", body, RecoveryResult.class);
    }

    private <T> T post(String path, Map<String, Object> body, Class<T> type) {
        try {
            T result = http.post().uri(path).contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(type);
            if (result == null) {
                throw new AgentException("Empty response from respond-agent " + path, null);
            }
            return result;
        } catch (RestClientException e) {
            throw new AgentException("respond-agent " + path + " failed", e);
        }
    }
}
