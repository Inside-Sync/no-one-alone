package com.noonealone.coreapi.web;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.noonealone.coreapi.flow.AlertIntake;
import com.noonealone.coreapi.flow.DemoService;
import com.noonealone.coreapi.model.Scenario;

@WebMvcTest({ApiController.class, InternalController.class})
@Import(ApiErrors.class)
class ApiControllerTest {

    @Autowired MockMvc mvc;
    @MockBean DemoService demo;
    @MockBean AlertIntake intake;

    @Test
    void triggerReturns202WithIncidentId() throws Exception {
        when(demo.trigger(Scenario.STROKE, 30, 15)).thenReturn("alert-1-stroke");

        mvc.perform(post("/api/demo/stroke").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.incidentId").value("alert-1-stroke"));
    }

    @Test
    void unknownScenarioIs400() throws Exception {
        mvc.perform(post("/api/demo/flood").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
    }

    @Test
    void pubSubEnvelopeIsDecoded() throws Exception {
        String data = Base64.getEncoder().encodeToString(
                "{\"alertId\":\"a-1\",\"personId\":\"ba-mai\",\"scenario\":\"STROKE\",\"kind\":\"HR_HIGH_NO_MOVEMENT\",\"hr\":142,\"movementMin\":4,\"demo\":{\"timerSeconds\":30,\"noReplySeconds\":15,\"clockOffsetMs\":-1}}"
                        .getBytes());

        mvc.perform(post("/alerts").contentType(MediaType.APPLICATION_JSON)
                .content("{\"message\":{\"data\":\"" + data + "\"}}"))
                .andExpect(status().isNoContent());

        verify(intake).receive(argThat(m -> m.alertId().equals("a-1") && m.scenario() == Scenario.STROKE));
    }
}
