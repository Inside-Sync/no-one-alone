package com.noonealone.coreapi.agent;

import java.io.IOException;

import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.IdTokenCredentials;
import com.google.auth.oauth2.IdTokenProvider;

class IdTokenInterceptor implements ClientHttpRequestInterceptor {

    private final IdTokenCredentials credentials;

    IdTokenInterceptor(String audience) {
        try {
            GoogleCredentials adc = GoogleCredentials.getApplicationDefault();
            credentials = IdTokenCredentials.newBuilder()
                    .setIdTokenProvider((IdTokenProvider) adc)
                    .setTargetAudience(audience)
                    .build();
        } catch (IOException e) {
            throw new IllegalStateException("No application default credentials for service-to-service calls", e);
        }
    }

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution)
            throws IOException {
        credentials.refreshIfExpired();
        request.getHeaders().setBearerAuth(credentials.getIdToken().getTokenValue());
        return execution.execute(request, body);
    }
}
