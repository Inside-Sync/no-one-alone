package com.noonealone.coreapi.gcp;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;

import org.springframework.stereotype.Component;

import com.google.cloud.pubsub.v1.Publisher;
import com.google.protobuf.ByteString;
import com.google.pubsub.v1.PubsubMessage;
import com.google.pubsub.v1.TopicName;
import com.noonealone.coreapi.config.NoaProperties;
import com.noonealone.coreapi.flow.AlertIntake;
import com.noonealone.coreapi.flow.AlertMessage;
import com.noonealone.coreapi.model.Docs;

@Component
public class AlertPublisher {

    private final Publisher publisher;
    private final AlertIntake intake;
    private final Executor executor;

    public AlertPublisher(NoaProperties props, AlertIntake intake, Executor executor) {
        this.intake = intake;
        this.executor = executor;
        try {
            this.publisher = props.pubsub().enabled()
                    ? Publisher.newBuilder(TopicName.of(props.projectId(), props.pubsub().topic())).build()
                    : null;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public void publish(AlertMessage msg) {
        if (publisher == null) {
            executor.execute(() -> intake.receive(msg));
            return;
        }
        try {
            byte[] json = Docs.mapper().writeValueAsBytes(msg);
            publisher.publish(PubsubMessage.newBuilder().setData(ByteString.copyFrom(json)).build())
                    .get(10, TimeUnit.SECONDS);
        } catch (Exception e) {
            throw new IllegalStateException("Could not publish alert " + msg.alertId(), e);
        }
    }
}
