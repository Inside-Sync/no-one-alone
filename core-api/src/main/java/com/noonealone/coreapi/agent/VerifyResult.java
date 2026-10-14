package com.noonealone.coreapi.agent;

public record VerifyResult(boolean isReal, String reason, String lastKnownWellAt, boolean fallback) {}
