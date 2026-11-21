package com.weekfit.common.api;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ApiResponseTest {

    @Test
    void okWrapsDataWithoutError() {
        ApiResponse<String> response = ApiResponse.ok("hello");

        assertThat(response.success()).isTrue();
        assertThat(response.data()).isEqualTo("hello");
        assertThat(response.error()).isNull();
    }

    @Test
    void failCarriesErrorWithoutData() {
        ApiResponse<Object> response = ApiResponse.fail("bad request");

        assertThat(response.success()).isFalse();
        assertThat(response.data()).isNull();
        assertThat(response.error()).isEqualTo("bad request");
    }
}
