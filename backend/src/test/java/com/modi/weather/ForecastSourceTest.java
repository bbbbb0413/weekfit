package com.modi.weather;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.modi.common.error.ExternalServiceException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class ForecastSourceTest {

    private static final double LAT = 37.57;
    private static final double LON = 126.98;

    private final OpenMeteoClient openMeteo = mock(OpenMeteoClient.class);
    private final MetNorwayClient metNorway = mock(MetNorwayClient.class);
    private final MutableClock clock = new MutableClock(Instant.parse("2026-11-22T06:30:00Z"));
    private final ForecastSource source = new ForecastSource(openMeteo, metNorway, clock);

    private final OpenMeteoResponse fromOpenMeteo = new OpenMeteoResponse(LAT, LON, null, null, null);
    private final OpenMeteoResponse fromMet = new OpenMeteoResponse(LAT, LON, null, null, null);

    @Test
    void usesOpenMeteoWhenItWorks() {
        when(openMeteo.forecast(anyDouble(), anyDouble())).thenReturn(fromOpenMeteo);

        assertThat(source.forecast(LAT, LON)).isSameAs(fromOpenMeteo);
        verify(metNorway, never()).forecast(anyDouble(), anyDouble());
    }

    @Test
    void rateLimitSkipsOpenMeteoUntilNextUtcDay() {
        when(openMeteo.forecast(anyDouble(), anyDouble()))
                .thenThrow(new OpenMeteoClient.RateLimitedException(new RuntimeException("429")));
        when(metNorway.forecast(anyDouble(), anyDouble())).thenReturn(fromMet);

        assertThat(source.forecast(LAT, LON)).isSameAs(fromMet);
        assertThat(source.forecast(LAT, LON)).isSameAs(fromMet);
        verify(openMeteo, times(1)).forecast(anyDouble(), anyDouble());

        clock.set(Instant.parse("2026-11-23T00:00:01Z"));
        source.forecast(LAT, LON);
        verify(openMeteo, times(2)).forecast(anyDouble(), anyDouble());
    }

    @Test
    void otherFailureFallsBackButRetriesOpenMeteoNextTime() {
        when(openMeteo.forecast(anyDouble(), anyDouble())).thenThrow(new ExternalServiceException("timeout"));
        when(metNorway.forecast(anyDouble(), anyDouble())).thenReturn(fromMet);

        assertThat(source.forecast(LAT, LON)).isSameAs(fromMet);
        clock.advance(Duration.ofMinutes(1));
        source.forecast(LAT, LON);
        verify(openMeteo, times(2)).forecast(anyDouble(), anyDouble());
    }

    @Test
    void bothFailingStillReportsUnavailable() {
        when(openMeteo.forecast(anyDouble(), anyDouble()))
                .thenThrow(new OpenMeteoClient.RateLimitedException(new RuntimeException("429")));
        when(metNorway.forecast(anyDouble(), anyDouble())).thenThrow(new ExternalServiceException("down"));

        assertThatThrownBy(() -> source.forecast(LAT, LON)).isInstanceOf(ExternalServiceException.class);
    }

    private static final class MutableClock extends Clock {
        private Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void set(Instant instant) {
            now = instant;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
