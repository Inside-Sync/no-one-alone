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
        client = new RespondAgentClient(props, builder, null);
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
    void triageParsesTheGoodbye() {
        server.expect(requestTo("http://agent/triage"))
                .andRespond(withSuccess("{\"level\":\"MONITOR\",\"reasons\":[],\"fallback\":false,"
                        + "\"closing\":{\"text\":\"Goodnight, Moza.\",\"audioBase64\":\"AQI=\",\"mimeType\":\"audio/mpeg\"}}",
                        MediaType.APPLICATION_JSON));

        TriageResult r = client.triage(Map.of());

        assertThat(r.closing().text()).isEqualTo("Goodnight, Moza.");
        assertThat(r.closing().audioBase64()).isEqualTo("AQI=");
    }

    @Test
    void checkinTurnParsesWhichScriptedQuestionItIs() {
        server.expect(requestTo("http://agent/checkin/turn"))
                .andRespond(withSuccess("{\"done\":false,\"fallback\":false,\"next\":{\"text\":\"Please repeat\",\"kind\":\"VOICE\",\"step\":\"SPEECH_CHECK\"}}",
                        MediaType.APPLICATION_JSON));

        assertThat(client.checkinTurn(Map.of()).next().step()).isEqualTo("SPEECH_CHECK");
    }

    @Test
    void checkinTurnFromAnOlderAgentHasNoStep() {
        server.expect(requestTo("http://agent/checkin/turn"))
                .andRespond(withSuccess("{\"done\":false,\"fallback\":false,\"next\":{\"text\":\"Hello\",\"kind\":\"VOICE\"}}",
                        MediaType.APPLICATION_JSON));

        assertThat(client.checkinTurn(Map.of()).next().step()).isNull();
    }

    @Test
    void recoveryParsesTheKeyOfEachReminder() {
        server.expect(requestTo("http://agent/recovery"))
                .andRespond(withSuccess("{\"summary\":\"s\",\"fallback\":false,\"reminders\":["
                        + "{\"time\":\"08:00\",\"kind\":\"MED\",\"text\":\"t\",\"key\":\"aspirin\"},"
                        + "{\"time\":\"09:00\",\"kind\":\"ACTIVITY\",\"text\":\"u\"}]}", MediaType.APPLICATION_JSON));

        assertThat(client.recovery(Map.of()).reminders()).extracting(r -> r.key()).containsExactly("aspirin", null);
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

    @Test
    void explainPostsTkeyAndLangAndParsesTheWording() {
        server.expect(requestTo("http://agent/explain")).andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.tkey").value("hf")).andExpect(jsonPath("$.lang").value("ar"))
                .andRespond(withSuccess("{\"explain\":\"e\",\"simpler\":\"s\"}", MediaType.APPLICATION_JSON));

        RespondAgentClient.ExplainResult r = client.explain(Map.of("tkey", "hf", "lang", "ar"));

        assertThat(r.explain()).isEqualTo("e");
        assertThat(r.simpler()).isEqualTo("s");
        server.verify();
    }

    @Test
    void explainWithABlankFieldIsAgentException() {
        server.expect(requestTo("http://agent/explain"))
                .andRespond(withSuccess("{\"explain\":\"e\",\"simpler\":\" \"}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.explain(Map.of())).isInstanceOf(AgentException.class);
    }

    @Test
    void explainGivesUpAtItsOwnReadTimeoutWhileASlowUpstreamIsStillThinking() throws Exception {
        var slow = com.sun.net.httpserver.HttpServer.create(new java.net.InetSocketAddress("127.0.0.1", 0), 0);
        slow.createContext("/explain", ex -> {
            try { Thread.sleep(2000); } catch (InterruptedException ignored) { }
            byte[] b = "{\"explain\":\"e\",\"simpler\":\"s\"}".getBytes();
            ex.getResponseHeaders().add("Content-Type", "application/json");
            ex.sendResponseHeaders(200, b.length);
            try (var o = ex.getResponseBody()) { o.write(b); } catch (java.io.IOException ignored) { }
        });
        slow.start();
        try {
            NoaProperties props = new NoaProperties("p", "r", "", new NoaProperties.Agent("http://127.0.0.1:" + slow.getAddress().getPort(), false),
                    null, null, null, null, null);
            RespondAgentClient c = new RespondAgentClient(props, RestClient.builder(), java.time.Duration.ofMillis(500));
            long t0 = System.nanoTime();

            assertThatThrownBy(() -> c.explain(Map.of("tkey", "hf", "lang", "en"))).isInstanceOf(AgentException.class);

            assertThat((System.nanoTime() - t0) / 1_000_000).isLessThan(1800);
        } finally {
            slow.stop(0);
        }
    }
}
