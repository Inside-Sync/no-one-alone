package com.noonealone.coreapi.data;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import com.noonealone.coreapi.model.Docs;

@Component
public class Seed {

    public SeedData data() {
        try (InputStream in = new ClassPathResource("data/seed.json").getInputStream()) {
            SeedData data = Docs.mapper().readValue(in, SeedData.class);
            data.people().forEach((id, p) -> p.id = id);
            data.hospitals().forEach((id, h) -> h.id = id);
            return data;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
