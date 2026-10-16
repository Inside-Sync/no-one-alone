package com.noonealone.coreapi.web;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.Executor;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.noonealone.coreapi.flow.Actions;
import com.noonealone.coreapi.flow.CheckInInput;
import com.noonealone.coreapi.flow.DemoService;
import com.noonealone.coreapi.flow.IncidentFlow;
import com.noonealone.coreapi.flow.Recovery;
import com.noonealone.coreapi.model.Scenario;

@RestController
@RequestMapping("/api")
public class ApiController {

    public record DemoRequest(Integer timerSeconds, Integer noReplySeconds, String personId) {}

    public record CheckInRequest(String yesNo, Boolean noReply) {}

    public record ActionRequest(String memberId, String action) {}

    private final DemoService demo;
    private final IncidentFlow flow;
    private final Actions actions;
    private final Recovery recovery;
    private final Executor executor;

    public ApiController(DemoService demo, IncidentFlow flow, Actions actions, Recovery recovery, Executor executor) {
        this.demo = demo;
        this.flow = flow;
        this.actions = actions;
        this.recovery = recovery;
        this.executor = executor;
    }

    @PostMapping("/demo/{scenario}")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> trigger(@PathVariable String scenario, @RequestBody(required = false) DemoRequest body) {
        Scenario s = Scenario.fromSlug(scenario)
                .orElseThrow(() -> ApiException.badRequest("Unknown scenario " + scenario));
        int timer = body != null && body.timerSeconds() != null ? body.timerSeconds() : 30;
        int noReply = body != null && body.noReplySeconds() != null ? body.noReplySeconds() : 15;
        String personId = body != null && body.personId() != null ? body.personId() : "ba-mai";
        return Map.of("incidentId", demo.trigger(s, personId, timer, noReply));
    }

    @PostMapping("/demo/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset() {
        demo.reset();
    }

    @PostMapping(value = "/incidents/{id}/checkin", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void checkInAudio(@PathVariable String id, @RequestPart("audio") MultipartFile audio) throws IOException {
        String type = audio.getContentType() == null ? "audio/webm" : audio.getContentType();
        checkIn(id, CheckInInput.ofAudio(audio.getBytes(), type));
    }

    @PostMapping(value = "/incidents/{id}/checkin", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void checkInJson(@PathVariable String id, @RequestBody CheckInRequest body) {
        checkIn(id, new CheckInInput(null, null, body.yesNo(), Boolean.TRUE.equals(body.noReply())));
    }

    @PostMapping("/incidents/{id}/actions")
    public Map<String, Long> action(@PathVariable String id, @RequestBody ActionRequest body) {
        if (body.memberId() == null || body.action() == null) {
            throw ApiException.badRequest("memberId and action are required");
        }
        return Map.of("version", actions.apply(id, body.memberId(), body.action()));
    }

    @PostMapping("/incidents/{id}/recovery")
    public Map<String, Long> recovery(@PathVariable String id, @RequestBody Recovery.Plan body) {
        return Map.of("version", recovery.discharge(id, body));
    }

    private void checkIn(String id, CheckInInput input) {
        flow.acceptCheckIn(id, input);
        executor.execute(() -> flow.processCheckIn(id, input));
    }
}
