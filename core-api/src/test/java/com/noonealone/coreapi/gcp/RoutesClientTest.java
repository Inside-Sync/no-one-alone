package com.noonealone.coreapi.gcp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import com.noonealone.coreapi.config.NoaProperties;
import com.noonealone.coreapi.model.LatLng;

class RoutesClientTest {

    static LatLng at(double lat, double lng) {
        LatLng l = new LatLng();
        l.lat = lat;
        l.lng = lng;
        return l;
    }

    private RoutesClient client(RestClient.Builder builder, String key) {
        NoaProperties props = new NoaProperties("p", "r", "", null, null, null, null, new NoaProperties.Maps(key), null);
        return new RoutesClient(props, builder);
    }

    @Test
    void roundsDurationUpToMinutes() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://routes.googleapis.com/directions/v2:computeRoutes"))
                .andExpect(header("X-Goog-Api-Key", "k"))
                .andExpect(header("X-Goog-FieldMask", "routes.duration"))
                .andRespond(withSuccess("{\"routes\":[{\"duration\":\"301s\"}]}", MediaType.APPLICATION_JSON));

        assertThat(client(builder, "k").etaMinutes(at(16.41, 107.69), at(16.40, 107.68))).contains(6);
    }

    @Test
    void serverErrorGivesEmpty() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://routes.googleapis.com/directions/v2:computeRoutes")).andRespond(withServerError());

        assertThat(client(builder, "k").etaMinutes(at(1, 1), at(2, 2))).isEmpty();
    }

    @Test
    void blankKeyMakesNoHttpCall() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer.bindTo(builder).build();

        assertThat(client(builder, "").etaMinutes(at(1, 1), at(2, 2))).isEmpty();
    }
}
