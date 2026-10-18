package com.noonealone.coreapi.config;

import java.io.IOException;
import java.time.Clock;
import java.util.function.Predicate;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.TokenVerifier;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.noonealone.coreapi.web.AuthFilter;
import com.noonealone.coreapi.web.RateLimitFilter;

@Configuration
public class AuthConfig {

    @Bean
    RateLimitFilter rateLimitFilter(Clock clock, @Value("${noa.rate-limit.trusted-hops:1}") int trustedHops) {
        return new RateLimitFilter(clock, trustedHops);
    }

    @Bean
    AuthFilter authFilter(NoaProperties props) throws IOException {
        if (!props.auth().enabled()) {
            return new AuthFilter(false, t -> false, t -> false);
        }
        if (FirebaseApp.getApps().isEmpty()) {
            FirebaseApp.initializeApp(FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.getApplicationDefault())
                    .setProjectId(props.projectId())
                    .build());
        }
        TokenVerifier oidc = TokenVerifier.newBuilder().setAudience(props.auth().audience()).build();
        Predicate<String> user = token -> {
            try {
                FirebaseAuth.getInstance().verifyIdToken(token);
                return true;
            } catch (Exception e) {
                return false;
            }
        };
        Predicate<String> service = token -> {
            try {
                Object email = oidc.verify(token).getPayload().get("email");
                return props.auth().invokerEmail().equals(email);
            } catch (Exception e) {
                return false;
            }
        };
        return new AuthFilter(true, user, service);
    }
}
