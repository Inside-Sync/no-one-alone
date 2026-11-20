package com.noonealone.coreapi.web;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Executor;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.noonealone.coreapi.agent.AgentException;
import com.noonealone.coreapi.agent.RespondAgentClient;
import com.noonealone.coreapi.flow.Actions;
import com.noonealone.coreapi.flow.ChatService;
import com.noonealone.coreapi.flow.CheckInInput;
import com.noonealone.coreapi.flow.DemoService;
import com.noonealone.coreapi.flow.IncidentFlow;
import com.noonealone.coreapi.flow.Recovery;
import com.noonealone.coreapi.model.Scenario;

@RestController
@RequestMapping("/api")
public class ApiController {

    public record DemoRequest(Integer timerSeconds, Integer noReplySeconds, String personId, Integer hr,
            Integer movementMin) {}

    public record CheckInRequest(String yesNo, Boolean noReply) {}

    public record ActionRequest(String memberId, String action) {}

    public record ExplainRequest(String tkey, String lang) {}

    public record NoaSayRequest(String callId, String lang, Map<String, Object> params) {}

    public record NoaOption(String id, String label) {}

    public record NoaUnderstandRequest(String qid, String lang, List<NoaOption> options, String reply) {}

    // The say call ids the respond agent serves (agents/respond/noa.py CALLS).
    private static final Set<String> NOA_CALLS = Set.of("detect.guardian", "detect.forecast", "protect.guardian",
            "home.voice.intro", "home.voice.retry", "home.voice.child", "home.insight", "pathway.navigator.offer",
            "pathway.forecast.why", "pathway.navigator.u1", "pathway.navigator.n3", "referral.courier",
            "referral.analyst", "composer.reply", "family.chat", "family.notify", "analyst.weekly");
    private static final Set<String> NOA_QIDS = Set.of("rf", "sym", "pref", "time", "book", "words");
    private static final Set<String> LANGS = Set.of("en", "ar");

    // Same four reachable teach sets as respond-agent ExplainIn.
    private static final Set<String> TEACH_KEYS = Set.of("stroke", "fall", "hypo", "hf");

    private final DemoService demo;
    private final IncidentFlow flow;
    private final Actions actions;
    private final Recovery recovery;
    private final Executor executor;
    private final ChatService chat;
    private final RespondAgentClient agent;

    public ApiController(DemoService demo, IncidentFlow flow, Actions actions, Recovery recovery, Executor executor,
            ChatService chat, RespondAgentClient agent) {
        this.demo = demo;
        this.flow = flow;
        this.actions = actions;
        this.recovery = recovery;
        this.executor = executor;
        this.chat = chat;
        this.agent = agent;
    }

    @PostMapping("/demo/{scenario}")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> trigger(@PathVariable String scenario, @RequestBody(required = false) DemoRequest body) {
        Scenario s = Scenario.fromSlug(scenario)
                .orElseThrow(() -> ApiException.badRequest("Unknown scenario " + scenario));
        int timer = body != null && body.timerSeconds() != null ? body.timerSeconds() : 30;
        int noReply = body != null && body.noReplySeconds() != null ? body.noReplySeconds() : 15;
        String personId = body != null && body.personId() != null ? body.personId() : "margaret";
        Integer hr = body == null ? null : body.hr();
        Integer movementMin = body == null ? null : body.movementMin();
        if (hr != null && (hr < 30 || hr > 220)) {
            throw ApiException.badRequest("hr must be 30..220");
        }
        if (movementMin != null && (movementMin < 0 || movementMin > 120)) {
            throw ApiException.badRequest("movementMin must be 0..120");
        }
        return Map.of("incidentId", demo.trigger(s, personId, timer, noReply, hr, movementMin));
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

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(@RequestBody ChatService.Request body) {
        try {
            return ResponseEntity.ok(Map.of("answer", chat.answer(body)));
        } catch (AgentException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", "CHAT_UNAVAILABLE"));
        }
    }

    @PostMapping("/explain")
    public Map<String, String> explain(@RequestBody ExplainRequest body) {
        if (body.tkey() == null || !TEACH_KEYS.contains(body.tkey())) {
            throw ApiException.badRequest("tkey must be a teach set");
        }
        if (body.lang() == null || !Set.of("en", "ar").contains(body.lang())) {
            throw ApiException.badRequest("lang must be en or ar");
        }
        try {
            RespondAgentClient.ExplainResult r = agent.explain(Map.of("tkey", body.tkey(), "lang", body.lang()));
            return Map.of("explain", r.explain(), "simpler", r.simpler());
        } catch (AgentException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AGENT_FAILED", "Explanation unavailable");
        }
    }

    @PostMapping("/noa/say")
    public Map<String, Object> noaSay(@RequestBody NoaSayRequest body) {
        if (body.callId() == null || !NOA_CALLS.contains(body.callId())) {
            throw ApiException.badRequest("callId must be a Noa call site");
        }
        if (body.lang() == null || !LANGS.contains(body.lang()) || body.params() == null) {
            throw ApiException.badRequest("lang must be en or ar and params is required");
        }
        try {
            RespondAgentClient.NoaSayResult r = agent.noaSay(Map.of("callId", body.callId(), "lang", body.lang(), "params", body.params()));
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("source", r.source());
            if ("live".equals(r.source())) out.put("text", r.text());
            else if (r.reason() != null) out.put("reason", r.reason());
            return out;
        } catch (AgentException e) {
            // Logs nothing: the cause can carry the request or response body.
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AGENT_FAILED", "Noa wording unavailable");
        }
    }

    @PostMapping("/noa/understand")
    public Map<String, String> noaUnderstand(@RequestBody NoaUnderstandRequest body) {
        if (body.qid() == null || !NOA_QIDS.contains(body.qid()) || body.lang() == null || !LANGS.contains(body.lang())) {
            throw ApiException.badRequest("qid must be a free-text question and lang en or ar");
        }
        List<NoaOption> opts = body.options();
        if (opts == null || opts.isEmpty() || opts.size() > 6 || opts.stream().anyMatch(o -> o == null || o.id() == null || o.label() == null)
                || body.reply() == null || body.reply().isBlank()) {
            throw ApiException.badRequest("1 to 6 options with id and label, and a reply, are required");
        }
        try {
            List<Map<String, String>> options = opts.stream().map(o -> Map.of("id", o.id(), "label", o.label())).toList();
            return Map.of("choice", agent.noaUnderstand(Map.of("qid", body.qid(), "lang", body.lang(), "options", options, "reply", body.reply())).choice());
        } catch (AgentException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AGENT_FAILED", "Noa reading unavailable");
        }
    }

    private void checkIn(String id, CheckInInput input) {
        flow.acceptCheckIn(id, input);
        executor.execute(() -> flow.processCheckIn(id, input));
    }
}
