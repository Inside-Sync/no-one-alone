package com.noonealone.coreapi.flow;

import java.util.concurrent.Executor;

import org.springframework.stereotype.Component;

@Component
public class AlertIntake {

    private final IncidentFlow flow;
    private final Executor executor;

    public AlertIntake(IncidentFlow flow, Executor executor) {
        this.flow = flow;
        this.executor = executor;
    }

    public void receive(AlertMessage msg) {
        if (flow.create(msg)) {
            executor.execute(() -> flow.process(msg.alertId()));
        }
    }
}
