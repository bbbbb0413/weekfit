package com.modi.weather;

import com.modi.common.error.ExternalServiceException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 예보 출처를 고른다. Open-Meteo 를 먼저 쓰고, 실패하면 MET Norway 로 대신한다.
 * Open-Meteo 무료 한도는 IP 단위라 공유 IP 를 쓰는 호스팅에서는 다른 서비스 때문에 소진될 수 있다.
 * 일일 한도(429)를 받으면 다음 UTC 자정까지 Open-Meteo 를 건너뛴다.
 */
@Component
class ForecastSource {

    private static final Logger log = LoggerFactory.getLogger(ForecastSource.class);

    private final OpenMeteoClient openMeteo;
    private final MetNorwayClient metNorway;
    private final Clock clock;
    private volatile Instant openMeteoBlockedUntil = Instant.EPOCH;

    ForecastSource(OpenMeteoClient openMeteo, MetNorwayClient metNorway, Clock clock) {
        this.openMeteo = openMeteo;
        this.metNorway = metNorway;
        this.clock = clock;
    }

    OpenMeteoResponse forecast(double latitude, double longitude) {
        Instant now = clock.instant();
        if (!now.isBefore(openMeteoBlockedUntil)) {
            try {
                return openMeteo.forecast(latitude, longitude);
            } catch (OpenMeteoClient.RateLimitedException e) {
                openMeteoBlockedUntil = nextUtcMidnight(now);
                log.warn("Open-Meteo daily limit reached, using MET Norway until {}", openMeteoBlockedUntil);
            } catch (ExternalServiceException e) {
                log.warn("Open-Meteo failed, trying MET Norway: {}", e.getCause() == null ? e.getMessage() : e.getCause().toString());
            }
        }
        return metNorway.forecast(latitude, longitude);
    }

    private static Instant nextUtcMidnight(Instant now) {
        return LocalDate.ofInstant(now, ZoneOffset.UTC).plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
    }
}
