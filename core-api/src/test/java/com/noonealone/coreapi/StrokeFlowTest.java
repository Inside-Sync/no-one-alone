package com.noonealone.coreapi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.noonealone.coreapi.agent.HandoffResult;
import com.noonealone.coreapi.agent.PlanResult;
import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.agent.TriageResult;
import com.noonealone.coreapi.agent.TurnResult;
import com.noonealone.coreapi.agent.VerifyResult;
import com.noonealone.coreapi.gcp.RoutesClient;
import com.noonealone.coreapi.gcp.EscalationTimers;
import com.noonealone.coreapi.model.Assessment;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Level;
import com.noonealone.coreapi.model.Status;
import com.noonealone.coreapi.store.IncidentStore;
import com.noonealone.coreapi.support.FirestoreTestBase;
import com.noonealone.coreapi.support.FixedClockConfig;
import com.noonealone.coreapi.support.SyncExecutorConfig;

@SpringBootTest
@AutoConfigureMockMvc
@Import({FixedClockConfig.class, SyncExecutorConfig.class})
class StrokeFlowTest extends FirestoreTestBase {

    @Autowired MockMvc mvc;
    @Autowired IncidentStore store;
    @Autowired ObjectMapper json;
    @MockBean RespondAgentClient agent;
    @MockBean EscalationTimers tasks;
    @MockBean RoutesClient routes;

    @Test
    void strokeNightFromAlertToBrotherAtTheDoor() throws Exception {
        Assessment slurred = new Assessment();
        slurred.clarity = "SLURRED";
        when(agent.verify(any())).thenReturn(new VerifyResult(true, "HR 142 at night", "2026-10-15T18:55:00Z", false));
        when(agent.checkinTurn(any()))
                .thenReturn(new TurnResult(null, null, new TurnResult.Next("Mạ ơi, mạ có nghe con nói không?", "VOICE", null, null), false, false))
                .thenReturn(new TurnResult("ừ... mạ nghe", slurred, null, true, false));
        when(agent.triage(any())).thenReturn(new TriageResult(Level.EMERGENCY, List.of("slurred speech"), false));
        when(agent.plan(any())).thenReturn(new PlanResult(
                List.of(new PlanResult.Message("ong-hung", "Chị Mai có thể đang bị đột quỵ."), new PlanResult.Message("lan", "Mẹ có dấu hiệu đột quỵ.")),
                "Địa chỉ 12 Kiệt 4", new PlanResult.Instruction(List.of("SIT_STILL"), "Mạ ngồi yên.", null, null), false));
        when(agent.handoff(any())).thenReturn(new HandoffResult("RECEIVED", Map.of("text", "PRE-ARRIVAL"), false));
        when(routes.etaMinutes(any(), any())).thenReturn(Optional.of(6));
        when(tasks.schedule(anyString(), anyString(), anyInt(), anyInt())).thenReturn("task");

        mvc.perform(post("/api/demo/reset")).andExpect(status().isNoContent());
        String body = mvc.perform(post("/api/demo/stroke").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();
        String id = json.readTree(body).get("incidentId").asText();

        mvc.perform(multipart("/api/incidents/" + id + "/checkin")
                .file(new MockMultipartFile("audio", "a.webm", "audio/webm", new byte[] {1})))
                .andExpect(status().isAccepted());
        mvc.perform(post("/api/incidents/" + id + "/actions").contentType(MediaType.APPLICATION_JSON)
                .content("{\"memberId\":\"ong-hung\",\"action\":\"ACCEPT\"}")).andExpect(status().isOk());
        mvc.perform(post("/api/incidents/" + id + "/actions").contentType(MediaType.APPLICATION_JSON)
                .content("{\"memberId\":\"ong-hung\",\"action\":\"ARRIVED\"}")).andExpect(status().isOk());

        Incident inc = store.get(id);
        assertThat(inc.status).isEqualTo(Status.ON_SCENE);
        assertThat(inc.level).isEqualTo(Level.EMERGENCY);
        assertThat(inc.handoff.status).isEqualTo("RECEIVED");
        assertThat(inc.timeline).extracting(t -> t.kind).containsSubsequence(
                "ALERT", "VERIFIED", "ASKED", "ANSWERED", "TRIAGED", "NOTIFIED", "ACCEPTED", "CALLED_115", "HANDOFF_SENT", "HANDOFF_RECEIVED", "FAMILY_UPDATE", "ARRIVED");
    }
}
