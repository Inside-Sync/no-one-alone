package com.noonealone.coreapi.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import com.noonealone.coreapi.data.Seed;
import com.noonealone.coreapi.data.SeedData;
import com.noonealone.coreapi.model.Docs;

/**
 * Adds a made-up person ("test-elder") with her own circle and two made-up hospitals to the seed, for the tests of the
 * flow engine that need a second circle shape. Her times are UTC+7, which has no daylight saving, so test times are
 * easy to read. The real seed (Moza and her circle) is untouched underneath.
 */
@TestConfiguration
public class TestPeopleConfig {

    private static final String EXTRA = """
            {
              "people": {
                "test-elder": {
                  "displayName": "Test Elder", "age": 78, "sex": "F", "timezone": "Asia/Ho_Chi_Minh", "locale": "en-AE",
                  "addressText": "12 Test Street", "emergencyNumber": "998",
                  "location": { "lat": 16.4012, "lng": 107.6871 },
                  "accessibility": { "hearing": "LOSS" },
                  "baseline": { "restingHr": 64, "nightHr": 58 },
                  "circle": [
                    { "memberId": "test-near", "relation": "brother", "role": "NEARBY", "priority": 1, "criticalAlerts": true },
                    { "memberId": "test-far", "relation": "daughter", "role": "DISTANT", "priority": 2, "criticalAlerts": true },
                    { "memberId": "test-extra", "relation": "son", "role": "DISTANT", "priority": 3, "criticalAlerts": false }
                  ]
                },
                "test-near": { "displayName": "Test Near", "timezone": "Asia/Ho_Chi_Minh", "locale": "en-AE", "location": { "lat": 16.4105, "lng": 107.6930 } },
                "test-far": { "displayName": "Test Far", "timezone": "Asia/Tokyo", "locale": "en-AE", "location": { "lat": 35.6812, "lng": 139.7671 } },
                "test-extra": { "displayName": "Test Extra", "timezone": "Asia/Ho_Chi_Minh", "locale": "en-AE", "location": { "lat": 10.7769, "lng": 106.7009 } }
              },
              "hospitals": {
                "test-stroke-center": { "name": "Test Stroke Center", "location": { "lat": 16.4637, "lng": 107.5909 }, "strokeReady": true },
                "test-district-clinic": { "name": "Test District Clinic", "location": { "lat": 16.4050, "lng": 107.6950 }, "strokeReady": false }
              }
            }
            """;

    @Bean
    @Primary
    Seed seedWithTestPeople() {
        return new Seed() {
            @Override
            public SeedData data() {
                SeedData data = super.data();
                try {
                    SeedData extra = Docs.mapper().readValue(EXTRA, SeedData.class);
                    extra.people().forEach((id, p) -> {
                        p.id = id;
                        data.people().put(id, p);
                    });
                    extra.hospitals().forEach((id, h) -> {
                        h.id = id;
                        data.hospitals().put(id, h);
                    });
                } catch (java.io.IOException e) {
                    throw new java.io.UncheckedIOException(e);
                }
                return data;
            }
        };
    }
}
