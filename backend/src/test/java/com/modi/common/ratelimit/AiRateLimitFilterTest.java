package com.modi.common.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class AiRateLimitFilterTest {

    private final AiRateLimitFilter filter =
            new AiRateLimitFilter(60, 2, Clock.fixed(Instant.parse("2026-11-21T00:10:00Z"), ZoneOffset.UTC));

    private int call(String path) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.setRemoteAddr("1.2.3.4");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response.getStatus();
    }

    @Test
    void findEndpointHasItsOwnLowerLimit() throws Exception {
        assertThat(call("/api/shopping/find")).isEqualTo(200);
        assertThat(call("/api/shopping/find")).isEqualTo(200);
        assertThat(call("/api/shopping/find")).isEqualTo(429);
    }

    @Test
    void otherAiEndpointsAreNotBlockedByFindLimit() throws Exception {
        call("/api/shopping/find");
        call("/api/shopping/find");
        call("/api/shopping/find");

        assertThat(call("/api/shopping/similar")).isEqualTo(200);
    }
}
