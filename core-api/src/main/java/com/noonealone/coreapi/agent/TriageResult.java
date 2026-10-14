package com.noonealone.coreapi.agent;

import java.util.List;

import com.noonealone.coreapi.model.Level;

public record TriageResult(Level level, List<String> reasons, boolean fallback) {}
