package com.noonealone.coreapi.web;

import java.io.IOException;
import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Per-IP and global request limits per clock minute on the public /api routes. */
// ponytail: in-memory per instance, so the real cap is up to max-instances times higher; move to Redis/Memorystore if that matters.
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);
    private static final int CHAT_PER_IP = 20;
    private static final int DEMO_PER_IP = 40;
    private static final int INCIDENTS_PER_IP = 60;
    private static final int CHAT_GLOBAL = 200;

    private final Clock clock;
    private final int trustedHops;
    private final Map<String, AtomicInteger> counts = new ConcurrentHashMap<>();
    private long minute = -1;

    /** @param trustedHops proxies that append to X-Forwarded-For after the client (Hosting adds one, seen by Cloud Run). */
    public RateLimitFilter(Clock clock, int trustedHops) {
        this.clock = clock;
        this.trustedHops = trustedHops;
    }

    private static String group(String path) {
        if (path.equals("/api/chat")) return "chat";
        if (path.startsWith("/api/demo/")) return "demo";
        if (path.startsWith("/api/incidents/")) return "incidents";
        return null;
    }

    private static int limit(String group) {
        return switch (group) {
            case "chat" -> CHAT_PER_IP;
            case "demo" -> DEMO_PER_IP;
            default -> INCIDENTS_PER_IP;
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

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String group = group(request.getRequestURI().replaceAll(";[^/]*", ""));
        if (group == null) {
            chain.doFilter(request, response);
            return;
        }
        long millis = clock.millis();
        long now = millis / 60_000;
        String ip = clientIp(request);
        boolean over = next(group + "|" + ip, now) > limit(group)
                || (group.equals("chat") && next("chat|*", now) > CHAT_GLOBAL);
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
}
