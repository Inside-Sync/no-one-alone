package com.noonealone.coreapi.web;

import java.io.IOException;
import java.util.Base64;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.noonealone.coreapi.flow.AlertIntake;
import com.noonealone.coreapi.flow.AlertMessage;
import com.noonealone.coreapi.model.Docs;

@RestController
public class InternalController {

    public record PushEnvelope(PushMessage message) {}

    public record PushMessage(String data) {}

    private final AlertIntake intake;

    public InternalController(AlertIntake intake) {
        this.intake = intake;
    }

    @PostMapping("/alerts")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void alert(@RequestBody PushEnvelope envelope) {
        if (envelope.message() == null || envelope.message().data() == null) {
            throw ApiException.badRequest("Missing Pub/Sub message data");
        }
        try {
            byte[] raw = Base64.getDecoder().decode(envelope.message().data());
            intake.receive(Docs.mapper().readValue(raw, AlertMessage.class));
        } catch (IOException | IllegalArgumentException e) {
            throw ApiException.badRequest("Alert message is not valid JSON");
        }
    }
}
