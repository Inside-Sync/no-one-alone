package com.noonealone.coreapi.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RateLimitFilterTest {

    private final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-10-18T14:00:05Z"));
    private final Clock clock = new Clock() {
        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now.get(); }
    };
    private final RateLimitFilter filter = new RateLimitFilter(clock, 1);

    /** Hosting puts the client IP before its own; Cloud Run appends the Hosting IP last. */
    private MockHttpServletResponse call(String path, String clientIp) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", path);
        req.setRequestURI(path);
        req.addHeader("X-Forwarded-For", clientIp + ", 66.249.82.232");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        return res;
    }

    private int okCount(String path, String ip, int tries) throws Exception {
        int ok = 0;
        for (int i = 0; i < tries; i++) {
            if (call(path, ip).getStatus() == 200) ok++;
        }
        return ok;
    }

    @Test
    void eachGroupHasItsOwnPerIpLimitPerMinute() throws Exception {
        assertThat(okCount("/api/chat", "1.1.1.1", 25)).isEqualTo(20);
        assertThat(okCount("/api/demo/stroke", "1.1.1.1", 45)).isEqualTo(40);
        assertThat(okCount("/api/incidents/a1/checkin", "1.1.1.1", 65)).isEqualTo(60);
    }

    @Test
    void overTheLimitIs429WithRetryAfter() throws Exception {
        okCount("/api/chat", "1.1.1.1", 20);
        MockHttpServletResponse res = call("/api/chat", "1.1.1.1");
        assertThat(res.getStatus()).isEqualTo(429);
        assertThat(res.getHeader("Retry-After")).isEqualTo("55");
        assertThat(res.getContentAsString()).contains("RATE_LIMITED");
    }

    @Test
    void anotherIpAndTheNextMinuteStartFresh() throws Exception {
        okCount("/api/chat", "1.1.1.1", 20);
        assertThat(call("/api/chat", "2.2.2.2").getStatus()).isEqualTo(200);
        now.set(Instant.parse("2026-10-18T14:01:00Z"));
        assertThat(call("/api/chat", "1.1.1.1").getStatus()).isEqualTo(200);
    }

    @Test
    void chatHasAGlobalCapOf200PerMinuteAcrossIps() throws Exception {
        int ok = 0;
        for (int ip = 0; ip < 15; ip++) ok += okCount("/api/chat", "10.0.0." + ip, 20);
        assertThat(ok).isEqualTo(200);
        assertThat(call("/api/demo/stroke", "10.0.0.99").getStatus()).isEqualTo(200);
    }

    @Test
    void aSpoofedLeadingEntryDoesNotChangeTheKey() throws Exception {
        okCount("/api/chat", "1.1.1.1", 20);
        assertThat(call("/api/chat", "9.9.9.9, 1.1.1.1").getStatus()).isEqualTo(429);
    }

    @Test
    void routesOutsideApiAreNotLimited() throws Exception {
        for (int i = 0; i < 100; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/alerts");
            req.setRequestURI("/alerts");
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(req, res, new MockFilterChain());
            assertThat(res.getStatus()).isEqualTo(200);
        }
    }
}
