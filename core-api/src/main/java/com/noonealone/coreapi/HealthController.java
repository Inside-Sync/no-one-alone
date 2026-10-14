package com.noonealone.coreapi;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    // /api/health is what Firebase Hosting reaches; /health is the run.app check.
    @GetMapping({"/health", "/api/health"})
    public Map<String, String> health() {
        return Map.of("service", "core-api", "status", "ok");
    }
}
