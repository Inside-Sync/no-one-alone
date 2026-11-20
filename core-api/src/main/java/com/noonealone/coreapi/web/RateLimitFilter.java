package com.noonealone.coreapi.web;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;

/** Per-IP and global request limits per clock minute on the public /api routes. */
// ponytail: in-memory per instance, so the real cap is up to max-instances times higher; move to Redis/Memorystore if that matters.
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);
    private static final int CHAT_PER_IP = 20;
    private static final int EXPLAIN_PER_IP = 5;
    private static final int DEMO_PER_IP = 40;
    private static final int INCIDENTS_PER_IP = 60;
    private static final int CHAT_GLOBAL = 200;
    private static final int EXPLAIN_GLOBAL = 20;
    private static final int NOA_SAY_PER_IP = 60;
    private static final int NOA_UNDERSTAND_PER_IP = 30;
    private static final int NOA_SAY_GLOBAL = 150;
    private static final int NOA_UNDERSTAND_GLOBAL = 60;
    private static final int NOA_SAY_DAILY = 1000;
    private static final int NOA_UNDERSTAND_DAILY = 1000;
    private static final int NOA_MAX_BODY = 16_384;

    private final Clock clock;
    private final int trustedHops;
    private final Map<String, AtomicInteger> counts = new ConcurrentHashMap<>();
    private final Map<String, AtomicInteger> dayCounts = new ConcurrentHashMap<>();
    private long minute = -1;
    private long day = -1;

    /** @param trustedHops proxies that append to X-Forwarded-For after the client (Hosting adds one, seen by Cloud Run). */
    public RateLimitFilter(Clock clock, int trustedHops) {
        this.clock = clock;
        this.trustedHops = trustedHops;
    }

    private static String group(String path) {
        if (path.equals("/api/chat")) return "chat";
        if (path.equals("/api/explain")) return "explain";
        if (path.equals("/api/noa/say")) return "noaSay";
        if (path.equals("/api/noa/understand")) return "noaUnderstand";
        if (path.startsWith("/api/demo/")) return "demo";
        if (path.startsWith("/api/incidents/")) return "incidents";
        return null;
    }

    private static int limit(String group) {
        return switch (group) {
            case "chat" -> CHAT_PER_IP;
            case "explain" -> EXPLAIN_PER_IP;
            case "noaSay" -> NOA_SAY_PER_IP;
            case "noaUnderstand" -> NOA_UNDERSTAND_PER_IP;
            case "demo" -> DEMO_PER_IP;
            default -> INCIDENTS_PER_IP;
        };
    }

    /** Cap across all IPs per minute; 0 means none. */
    private static int global(String group) {
        return switch (group) {
            case "chat" -> CHAT_GLOBAL;
            case "explain" -> EXPLAIN_GLOBAL;
            case "noaSay" -> NOA_SAY_GLOBAL;
            case "noaUnderstand" -> NOA_UNDERSTAND_GLOBAL;
            default -> 0;
        };
    }

    /** Cap per instance per UTC day; 0 means none. In memory, so a restart resets it. */
    private static int daily(String group) {
        return switch (group) {
            case "noaSay" -> NOA_SAY_DAILY;
            case "noaUnderstand" -> NOA_UNDERSTAND_DAILY;
            default -> 0;
        };
    }

    /** The entry `trustedHops` from the right, so entries a caller prepends never become the key. */
    String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff == null || xff.isBlank()) return request.getRemoteAddr();
        String[] hops = xff.split(",");
        return hops[Math.max(0, hops.length - 1 - trustedHops)].trim();
    }

    private int next(String key, long now) {
        synchronized (this) {
            if (now != minute) {
                minute = now;
                counts.clear();
            }
        }
        return counts.computeIfAbsent(key, k -> new AtomicInteger()).incrementAndGet();
    }

    private int nextDay(String group, long today) {
        synchronized (this) {
            if (today != day) {
                day = today;
                dayCounts.clear();
            }
        }
        return dayCounts.computeIfAbsent(group, k -> new AtomicInteger()).incrementAndGet();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String group = group(request.getRequestURI().replaceAll(";[^/]*", ""));
        if (group == null) {
            chain.doFilter(request, response);
            return;
        }
        if (group.startsWith("noa")) {
            if (request.getContentLengthLong() < 0) {
                // No Content-Length (chunked): read at most the cap plus one byte, then serve the bytes again.
                byte[] body = request.getInputStream().readNBytes(NOA_MAX_BODY + 1);
                request = new BufferedBody(request, body);
            }
            if (request.getContentLengthLong() > NOA_MAX_BODY) {
                response.setStatus(413);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":{\"code\":\"PAYLOAD_TOO_LARGE\",\"message\":\"Request body too large\"}}");
                return;
            }
        }
        long millis = clock.millis();
        long now = millis / 60_000;
        String ip = clientIp(request);
        boolean over = next(group + "|" + ip, now) > limit(group)
                || (global(group) > 0 && next(group + "|*", now) > global(group));
        if (!over && daily(group) > 0 && nextDay(group, millis / 86_400_000) > daily(group)) {
            log.warn("Daily limit reached {} ip={}", group, ip);
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(86_400 - (millis / 1000) % 86_400));
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":{\"code\":\"RATE_LIMITED\",\"message\":\"Daily limit reached, try again after midnight UTC\"}}");
            return;
        }
        if (over) {
            log.warn("Rate limited {} ip={} xff={}", group, ip, request.getHeader("X-Forwarded-For"));
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(60 - (millis / 1000) % 60));
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":{\"code\":\"RATE_LIMITED\",\"message\":\"Too many requests, try again in a minute\"}}");
            return;
        }
        chain.doFilter(request, response);
    }

    /** A request whose body was read up front; the length is the bytes read, so an oversize body shows as over the cap. */
    private static final class BufferedBody extends HttpServletRequestWrapper {
        private final byte[] body;

        BufferedBody(HttpServletRequest request, byte[] body) {
            super(request);
            this.body = body;
        }

        @Override
        public long getContentLengthLong() {
            return body.length;
        }

        @Override
        public int getContentLength() {
            return body.length;
        }

        @Override
        public ServletInputStream getInputStream() {
            ByteArrayInputStream in = new ByteArrayInputStream(body);
            return new ServletInputStream() {
                @Override public int read() { return in.read(); }
                @Override public int read(byte[] b, int off, int len) { return in.read(b, off, len); }
                @Override public boolean isFinished() { return in.available() == 0; }
                @Override public boolean isReady() { return true; }
                @Override public void setReadListener(ReadListener listener) { throw new UnsupportedOperationException(); }
            };
        }

        @Override
        public BufferedReader getReader() {
            return new BufferedReader(new InputStreamReader(getInputStream(), java.nio.charset.StandardCharsets.UTF_8));
        }
    }
}
