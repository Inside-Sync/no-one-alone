package com.noonealone.coreapi.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import com.noonealone.coreapi.flow.Actions;
import com.noonealone.coreapi.flow.AlertIntake;
import com.noonealone.coreapi.flow.DemoService;
import com.noonealone.coreapi.flow.IncidentFlow;
import com.noonealone.coreapi.model.Scenario;
import com.noonealone.coreapi.support.SyncExecutorConfig;

@WebMvcTest({ApiController.class, InternalController.class})
@Import({ApiErrors.class, SyncExecutorConfig.class})
class ApiControllerTest {

    @Autowired MockMvc mvc;
    @MockBean DemoService demo;
    @MockBean IncidentFlow flow;
    @MockBean Actions actions;
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
    void audioCheckInIsAcceptedThenProcessed() throws Exception {
        MockMultipartFile audio = new MockMultipartFile("audio", "a.webm", "audio/webm", new byte[] {1, 2, 3});

        mvc.perform(multipart("/api/incidents/i-1/checkin").file(audio)).andExpect(status().isAccepted());

        verify(flow).acceptCheckIn(eq("i-1"), argThat(i -> i.audio().length == 3));
        verify(flow).processCheckIn(eq("i-1"), any());
    }

    @Test
    void busyCheckInIs409() throws Exception {
        doThrow(ApiException.invalidState("Check-in is not waiting for an answer"))
                .when(flow).acceptCheckIn(eq("i-1"), any());

        mvc.perform(post("/api/incidents/i-1/checkin").contentType(MediaType.APPLICATION_JSON).content("{\"yesNo\":\"YES\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("INVALID_STATE"));
    }

    @Test
    void actionReturnsVersion() throws Exception {
        when(actions.apply("i-1", "ong-hung", "ACCEPT")).thenReturn(10L);

        mvc.perform(post("/api/incidents/i-1/actions").contentType(MediaType.APPLICATION_JSON)
                .content("{\"memberId\":\"ong-hung\",\"action\":\"ACCEPT\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(10));
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

    @Test
    void timeoutRouteCallsActions() throws Exception {
        mvc.perform(post("/tasks/escalation-timeout").contentType(MediaType.APPLICATION_JSON)
                .content("{\"incidentId\":\"i-1\",\"memberId\":\"ong-hung\",\"attempt\":1}"))
                .andExpect(status().isOk());

        verify(actions).timeout("i-1", "ong-hung", 1);
    }

    @Test
    void alertWithoutRequiredFieldIsRejected() throws Exception {
        String data = Base64.getEncoder().encodeToString(
                "{\"alertId\":\"a-1\",\"personId\":\"ba-mai\",\"scenario\":\"STROKE\"}".getBytes());

        mvc.perform(post("/alerts").contentType(MediaType.APPLICATION_JSON)
                .content("{\"message\":{\"data\":\"" + data + "\"}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));

        verify(intake, never()).receive(any());
    }
}
