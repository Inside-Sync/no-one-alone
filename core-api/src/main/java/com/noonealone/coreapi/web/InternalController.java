package com.noonealone.coreapi.web;

import java.io.IOException;
import java.util.Base64;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.noonealone.coreapi.flow.Actions;
import com.noonealone.coreapi.flow.AlertIntake;
import com.noonealone.coreapi.flow.AlertMessage;
import com.noonealone.coreapi.model.Docs;

@RestController
public class InternalController {

    public record PushEnvelope(PushMessage message) {}

    public record PushMessage(String data) {}

    public record TimeoutRequest(String incidentId, String memberId, int attempt) {}

    private final AlertIntake intake;
    private final Actions actions;

    public InternalController(AlertIntake intake, Actions actions) {
        this.intake = intake;
        this.actions = actions;
    }

    @PostMapping("/alerts")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void alert(@RequestBody PushEnvelope envelope) {
        if (envelope.message() == null || envelope.message().data() == null) {
            throw ApiException.badRequest("Missing Pub/Sub message data");
        }
        AlertMessage msg;
        try {
            byte[] raw = Base64.getDecoder().decode(envelope.message().data());
            msg = Docs.mapper().readValue(raw, AlertMessage.class);
        } catch (IOException | IllegalArgumentException e) {
            throw ApiException.badRequest("Alert message is not valid JSON");
        }
        if (msg.alertId() == null || msg.personId() == null || msg.scenario() == null || msg.demo() == null) {
            throw ApiException.badRequest("Alert message is missing required fields");
        }
        intake.receive(msg);
    }

    @PostMapping("/tasks/escalation-timeout")
    public Map<String, String> timeout(@RequestBody TimeoutRequest body) {
        actions.timeout(body.incidentId(), body.memberId(), body.attempt());
        return Map.of("status", "ok");
    }
}
