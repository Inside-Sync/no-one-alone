package com.noonealone.coreapi.support;

import java.util.concurrent.Executor;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration
public class SyncExecutorConfig {

    @Bean
    @Primary
    Executor syncExecutor() {
        return Runnable::run;
    }
}
