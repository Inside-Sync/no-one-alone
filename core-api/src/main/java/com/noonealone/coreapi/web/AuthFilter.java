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

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !enabled || path.equals("/health") || path.equals("/api/health");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        String header = request.getHeader("Authorization");
        String token = header != null && header.startsWith("Bearer ") ? header.substring(7) : null;
        boolean ok;
        if (path.startsWith("/api/")) {
            ok = token != null && userToken.test(token);
        } else if (path.equals("/alerts") || path.startsWith("/tasks/")) {
            ok = token != null && serviceToken.test(token);
        } else {
            ok = true;
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
