package com.noonealone.coreapi.agent;

import java.util.List;

public record PlanResult(List<Message> messages, String callScript, Instruction personInstruction, boolean fallback) {
    public record Message(String memberId, String text) {}

    public record Instruction(List<String> scriptIds, String text, String audioBase64, String mimeType) {}
}
