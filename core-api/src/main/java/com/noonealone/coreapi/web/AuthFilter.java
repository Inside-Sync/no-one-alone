package com.noonealone.coreapi.web;

import java.io.IOException;
import java.util.function.Predicate;

import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class AuthFilter extends OncePerRequestFilter {

    private final boolean enabled;
    private final Predicate<String> userToken;
    private final Predicate<String> serviceToken;

    public AuthFilter(boolean enabled, Predicate<String> userToken, Predicate<String> serviceToken) {
        this.enabled = enabled;
        this.userToken = userToken;
        this.serviceToken = serviceToken;
    }

    private static String path(HttpServletRequest request) {
        return request.getRequestURI().replaceAll(";[^/]*", "");
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = path(request);
        return !enabled || path.equals("/health") || path.equals("/api/health");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = path(request);
        String header = request.getHeader("Authorization");
        String token = header != null && header.startsWith("Bearer ") ? header.substring(7) : null;
        boolean ok;
        if (path.equals("/api") || path.startsWith("/api/")) {
            ok = token != null && userToken.test(token);
        } else {
            ok = token != null && serviceToken.test(token);
        }
        if (!ok) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":{\"code\":\"UNAUTHENTICATED\",\"message\":\"Missing or invalid token\"}}");
            return;
        }
        chain.doFilter(request, response);
    }
}
