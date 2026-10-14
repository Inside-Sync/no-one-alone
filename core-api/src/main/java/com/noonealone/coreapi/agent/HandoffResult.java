package com.noonealone.coreapi.agent;

import java.util.Map;

public record HandoffResult(String status, Map<String, Object> packet, boolean fallback) {}
