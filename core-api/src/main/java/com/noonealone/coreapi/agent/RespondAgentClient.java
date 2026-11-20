package com.noonealone.coreapi.agent;

import java.time.Duration;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.noonealone.coreapi.config.NoaProperties;

@Component
public class RespondAgentClient {

    public record ChatResult(String answer) {}

    public record ExplainResult(String explain, String simpler) {}

    public record NoaSayResult(String source, String text, String reason) {}

    public record NoaUnderstandResult(String choice) {}

    private static final Duration SHORT_READ_TIMEOUT = Duration.ofSeconds(10);

    private final RestClient http;
    private final RestClient shortHttp;

    @Autowired
    public RespondAgentClient(NoaProperties props, RestClient.Builder builder) {
        this(props, builder, SHORT_READ_TIMEOUT);
    }

    /** `shortRead` null shares the main client; /explain and /noa/* get a short read timeout so the web falls back fast. */
    RespondAgentClient(NoaProperties props, RestClient.Builder builder, Duration shortRead) {
        builder.baseUrl(props.respondAgent().url());
        if (props.respondAgent().auth()) {
            builder.requestInterceptor(new IdTokenInterceptor(props.respondAgent().url()));
        }
        this.shortHttp = shortRead == null ? null : builder.clone().requestFactory(shortFactory(shortRead)).build();
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

    public ChatResult chat(Map<String, Object> body) {
        ChatResult r = post("/chat", body, ChatResult.class);
        if (r.answer() == null || r.answer().isBlank()) {
            throw new AgentException("Empty answer from respond-agent /chat", null);
        }
        return r;
    }

    private static JdkClientHttpRequestFactory shortFactory(Duration read) {
        JdkClientHttpRequestFactory f = new JdkClientHttpRequestFactory(
                java.net.http.HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        f.setReadTimeout(read);
        return f;
    }

    private RestClient shortClient() {
        return shortHttp == null ? http : shortHttp;
    }

    public NoaSayResult noaSay(Map<String, Object> body) {
        NoaSayResult r = post(shortClient(), "/noa/say", body, NoaSayResult.class);
        boolean live = "live".equals(r.source()) && r.text() != null && !r.text().isBlank();
        if (!live && !"guardrail".equals(r.source())) {
            throw new AgentException("Bad reply from respond-agent /noa/say", null);
        }
        return r;
    }

    public NoaUnderstandResult noaUnderstand(Map<String, Object> body) {
        NoaUnderstandResult r = post(shortClient(), "/noa/understand", body, NoaUnderstandResult.class);
        if (r.choice() == null || r.choice().isBlank()) {
            throw new AgentException("Empty choice from respond-agent /noa/understand", null);
        }
        return r;
    }

    public ExplainResult explain(Map<String, Object> body) {
        ExplainResult r = post(shortClient(), "/explain", body, ExplainResult.class);
        if (r.explain() == null || r.explain().isBlank() || r.simpler() == null || r.simpler().isBlank()) {
            throw new AgentException("Empty explanation from respond-agent /explain", null);
        }
        return r;
    }

    private <T> T post(String path, Map<String, Object> body, Class<T> type) {
        return post(http, path, body, type);
    }

    private <T> T post(RestClient http, String path, Map<String, Object> body, Class<T> type) {
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
