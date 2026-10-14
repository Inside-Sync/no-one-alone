package com.noonealone.coreapi.web;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.noonealone.coreapi.flow.DemoService;
import com.noonealone.coreapi.model.Scenario;

@RestController
@RequestMapping("/api")
public class ApiController {

    public record DemoRequest(Integer timerSeconds, Integer noReplySeconds) {}

    private final DemoService demo;

    public ApiController(DemoService demo) {
        this.demo = demo;
    }

    @PostMapping("/demo/{scenario}")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> trigger(@PathVariable String scenario, @RequestBody(required = false) DemoRequest body) {
        Scenario s = Scenario.fromSlug(scenario)
                .orElseThrow(() -> ApiException.badRequest("Unknown scenario " + scenario));
        int timer = body != null && body.timerSeconds() != null ? body.timerSeconds() : 30;
        int noReply = body != null && body.noReplySeconds() != null ? body.noReplySeconds() : 15;
        return Map.of("incidentId", demo.trigger(s, timer, noReply));
    }

    @PostMapping("/demo/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset() {
        demo.reset();
    }
}
