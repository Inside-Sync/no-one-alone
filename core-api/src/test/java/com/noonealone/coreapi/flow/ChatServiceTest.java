package com.noonealone.coreapi.flow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.store.IncidentStore;
import com.noonealone.coreapi.web.ApiException;

/** The chat language, without Firestore: the store and the agent are mocks. */
class ChatServiceTest {

    RespondAgentClient agent = mock(RespondAgentClient.class);
    ChatService chat;

    @BeforeEach
    void setUp() {
        chat = new ChatService(mock(IncidentStore.class), agent);
        when(agent.chat(any())).thenReturn(new RespondAgentClient.ChatResult("ok"));
    }

    static ChatService.Request request(String lang) {
        return new ChatService.Request("Who is with her?", "fam", "james", List.of(), lang);
    }

    @Test
    void langIsPassedToTheAgentAndDefaultsToEnglish() {
        chat.answer(request("ar"));
        chat.answer(request(null));
        chat.answer(new ChatService.Request("Who is with her?", "fam", null, null));

        verify(agent).chat(argThat(b -> "ar".equals(b.get("lang"))));
        verify(agent, org.mockito.Mockito.times(2)).chat(argThat(b -> "en".equals(b.get("lang"))));
    }

    @Test
    void anyOtherLangIsBadRequestAndCallsNoAgent() {
        for (String lang : List.of("vi", "EN", "", "fr")) {
            assertThatThrownBy(() -> chat.answer(request(lang))).isInstanceOf(ApiException.class)
                    .hasMessageContaining("lang must be en or ar");
        }

        verify(agent, never()).chat(any());
    }

    @Test
    void theOtherFieldsAreStillChecked() {
        assertThat(List.of("en", "ar")).allSatisfy(lang -> assertThatThrownBy(
                () -> chat.answer(new ChatService.Request(" ", "fam", null, null, lang))).isInstanceOf(ApiException.class));
    }
}
