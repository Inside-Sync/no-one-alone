package com.noonealone.coreapi.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class AuthFilterTest {

    private final AuthFilter filter = new AuthFilter(true, "user-ok"::equals, "svc-ok"::equals);

    private int status(String path, String token) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", path);
        req.setRequestURI(path);
        if (token != null) {
            req.addHeader("Authorization", "Bearer " + token);
        }
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        return res.getStatus();
    }

    @Test
    void apiNeedsAFirebaseToken() throws Exception {
        assertThat(status("/api/demo/stroke", null)).isEqualTo(401);
        assertThat(status("/api/demo/stroke", "svc-ok")).isEqualTo(401);
        assertThat(status("/api/demo/stroke", "user-ok")).isEqualTo(200);
    }

    @Test
    void internalRoutesNeedTheServiceToken() throws Exception {
        assertThat(status("/alerts", "user-ok")).isEqualTo(401);
        assertThat(status("/tasks/escalation-timeout", "user-ok")).isEqualTo(401);
        assertThat(status("/tasks/escalation-timeout", "svc-ok")).isEqualTo(200);
    }

    @Test
    void healthIsOpenAndDisabledFilterPassesAll() throws Exception {
        assertThat(status("/api/health", null)).isEqualTo(200);
        AuthFilter off = new AuthFilter(false, t -> false, t -> false);
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/alerts");
        req.setRequestURI("/alerts");
        MockHttpServletResponse res = new MockHttpServletResponse();
        off.doFilter(req, res, new MockFilterChain());
        assertThat(res.getStatus()).isEqualTo(200);
    }
}
