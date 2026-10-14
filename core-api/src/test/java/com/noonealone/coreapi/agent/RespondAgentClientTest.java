package com.noonealone.coreapi.agent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import com.noonealone.coreapi.config.NoaProperties;
import com.noonealone.coreapi.model.Level;

class RespondAgentClientTest {

    private MockRestServiceServer server;
    private RespondAgentClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        NoaProperties props = new NoaProperties("p", "r", "", new NoaProperties.Agent("http://agent", false),
                null, null, null, null, null);
        client = new RespondAgentClient(props, builder);
    }

    @Test
    void verifyPostsJsonAndParsesIsReal() {
        server.expect(requestTo("http://agent/verify")).andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.alert.hr").value(142))
                .andRespond(withSuccess("{\"isReal\":true,\"reason\":\"r\",\"lastKnownWellAt\":\"2026-10-15T18:55:00Z\",\"fallback\":false,\"extra\":1}",
                        MediaType.APPLICATION_JSON));

        VerifyResult r = client.verify(Map.of("alert", Map.of("hr", 142)));

        assertThat(r.isReal()).isTrue();
        assertThat(r.lastKnownWellAt()).isEqualTo("2026-10-15T18:55:00Z");
        server.verify();
    }

    @Test
    void triageParsesLevel() {
        server.expect(requestTo("http://agent/triage"))
                .andRespond(withSuccess("{\"level\":\"EMERGENCY\",\"reasons\":[\"slurred speech\"],\"fallback\":false}",
                        MediaType.APPLICATION_JSON));

        assertThat(client.triage(Map.of()).level()).isEqualTo(Level.EMERGENCY);
    }

    @Test
    void serverErrorBecomesAgentException() {
        server.expect(requestTo("http://agent/plan")).andRespond(withServerError());

        assertThatThrownBy(() -> client.plan(Map.of())).isInstanceOf(AgentException.class);
    }

    @Test
    void noAuthorizationHeaderWhenAuthIsOff() {
        server.expect(requestTo("http://agent/handoff"))
                .andExpect(request -> assertThat(request.getHeaders().containsKey("Authorization")).isFalse())
                .andRespond(withSuccess("{\"status\":\"RECEIVED\",\"packet\":{},\"fallback\":false}", MediaType.APPLICATION_JSON));

        assertThat(client.handoff(Map.of()).status()).isEqualTo("RECEIVED");
    }
}
