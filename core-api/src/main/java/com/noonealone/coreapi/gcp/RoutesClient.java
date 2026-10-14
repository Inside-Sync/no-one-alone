package com.noonealone.coreapi.gcp;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.noonealone.coreapi.config.NoaProperties;
import com.noonealone.coreapi.model.LatLng;

@Component
public class RoutesClient {

    private final RestClient http;
    private final String apiKey;

    public RoutesClient(NoaProperties props, RestClient.Builder builder) {
        this.apiKey = props.maps().apiKey();
        this.http = builder.baseUrl("https://routes.googleapis.com").build();
    }

    public Optional<Integer> etaMinutes(LatLng from, LatLng to) {
        if (apiKey == null || apiKey.isBlank() || from == null || to == null) {
            return Optional.empty();
        }
        Map<String, Object> body = Map.of("origin", waypoint(from), "destination", waypoint(to), "travelMode", "DRIVE");
        try {
            Map<?, ?> res = http.post().uri("/directions/v2:computeRoutes")
                    .header("X-Goog-Api-Key", apiKey)
                    .header("X-Goog-FieldMask", "routes.duration")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body).retrieve().body(Map.class);
            List<?> routes = res == null ? null : (List<?>) res.get("routes");
            if (routes == null || routes.isEmpty()) {
                return Optional.empty();
            }
            String duration = (String) ((Map<?, ?>) routes.get(0)).get("duration");
            long seconds = Long.parseLong(duration.replace("s", ""));
            return Optional.of((int) Math.ceil(seconds / 60.0));
        } catch (RuntimeException e) {
            return Optional.empty();
        }
    }

    private static Map<String, Object> waypoint(LatLng p) {
        return Map.of("location", Map.of("latLng", Map.of("latitude", p.lat, "longitude", p.lng)));
    }
}
