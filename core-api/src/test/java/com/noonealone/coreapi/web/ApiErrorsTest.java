package com.noonealone.coreapi.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

class ApiErrorsTest {

    @RestController
    static class Thrower {
        @GetMapping("/boom")
        String boom() {
            throw ApiException.conflict("ALREADY_OWNED", "Ông Hùng is already on the way");
        }
    }

    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new Thrower())
            .setControllerAdvice(new ApiErrors()).build();

    @Test
    void apiExceptionBecomesContractErrorShape() throws Exception {
        mvc.perform(get("/boom"))
                .andExpect(status().is(HttpStatus.CONFLICT.value()))
                .andExpect(jsonPath("$.error.code").value("ALREADY_OWNED"))
                .andExpect(jsonPath("$.error.message").value("Ông Hùng is already on the way"));
    }
}
