package com.noonealone.coreapi.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.noonealone.coreapi.agent.AgentException;
import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.data.Seed;
import com.noonealone.coreapi.model.DemoCurrent;
import com.noonealone.coreapi.model.HandoffInfo;
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
class ChatTest extends FirestoreTestBase {

    @Autowired MockMvc mvc;
    @Autowired IncidentStore store;
    @Autowired Seed seed;
    @MockBean RespondAgentClient agent;

    static final String BODY = "{\"question\":\"Who is with her?\",\"mode\":\"fam\",\"viewer\":\"james\","
            + "\"history\":[{\"by\":\"me\",\"text\":\"Hi\"},{\"by\":\"noa\",\"text\":\"Hello\"}]}";

    @BeforeEach
    void incident() {
        store.seed(seed.data());
        Incident inc = new Incident();
        inc.id = "c-1";
        inc.personId = "margaret";
        inc.status = Status.ESCALATING;
        inc.level = Level.EMERGENCY;
        inc.createdAt = "2026-10-15T19:00:00Z";
        inc.handoff = new HandoffInfo();
        inc.handoff.hospitalName = "Camperdown Stroke Centre";
        inc.log("2026-10-15T19:01:00Z", "SYSTEM", "ACCEPTED", "David accepted");
        store.createIfAbsent(inc);
        DemoCurrent current = new DemoCurrent();
        current.incidentId = "c-1";
        current.personId = "margaret";
        store.setCurrent(current);
    }

    @Test
    void chatForwardsQuestionAndSnapshotAndReturnsAnswer() throws Exception {
        when(agent.chat(any())).thenReturn(new RespondAgentClient.ChatResult("David is on his way."));

        mvc.perform(post("/api/chat").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value("David is on his way."));

        verify(agent).chat(argThat(b -> {
            Map<?, ?> snap = (Map<?, ?>) b.get("snapshot");
            return snap != null && "Who is with her?".equals(b.get("question")) && "fam".equals(b.get("mode"))
                    && "james".equals(b.get("viewer")) && ((List<?>) b.get("history")).size() == 2
                    && "ESCALATING".equals(snap.get("status")) && "EMERGENCY".equals(snap.get("level"))
                    && "Camperdown Stroke Centre".equals(snap.get("hospital"))
                    && snap.get("timeline").toString().contains("David accepted");
        }));
    }

    @Test
    void agentFailureIs502ChatUnavailable() throws Exception {
        when(agent.chat(any())).thenThrow(new AgentException("down", null));

        mvc.perform(post("/api/chat").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.error").value("CHAT_UNAVAILABLE"));
    }

    @Test
    void invalidBodyIs400AndCallsNoAgent() throws Exception {
        mvc.perform(post("/api/chat").contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"\",\"mode\":\"fam\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/chat").contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"Hi\",\"mode\":\"boss\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/chat").contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"Hi\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/chat").contentType(MediaType.APPLICATION_JSON)
                .content("{\"question\":\"Hi\",\"mode\":\"fam\",\"history\":[{\"text\":\"Hi\"}]}"))
                .andExpect(status().isBadRequest());

        verify(agent, never()).chat(any());
    }
}
