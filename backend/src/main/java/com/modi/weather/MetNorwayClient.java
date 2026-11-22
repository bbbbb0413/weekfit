package com.modi.weather;

import com.modi.common.error.ExternalServiceException;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * MET Norway locationforecast 예보. 키 없이 무료이며, 이용 약관상 앱 이름과 연락처가 담긴 User-Agent 가 필요하다.
 * https://api.met.no/doc/TermsOfService
 */
@Component
class MetNorwayClient {

    private static final String BASE_URL = "https://api.met.no";
    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final int DAYS = 7;

    private final RestClient restClient;
    private final String userAgent;
    private final Clock clock;

    MetNorwayClient(RestClient.Builder builder, @Value("${modi.weather.user-agent}") String userAgent, Clock clock) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(TIMEOUT);
        factory.setReadTimeout(TIMEOUT);
        this.restClient = builder.baseUrl(BASE_URL).requestFactory(factory).build();
        this.userAgent = userAgent;
        this.clock = clock;
    }

    OpenMeteoResponse forecast(double latitude, double longitude) {
        try {
            MetNorwayResponse response = restClient.get()
                    .uri(uri -> uri.path("/weatherapi/locationforecast/2.0/complete")
                            // 약관 권장: 좌표는 소수 넷째 자리까지만 보낸다. 캐시 적중을 위해 둘째 자리로 맞춘다
                            .queryParam("lat", round2(latitude))
                            .queryParam("lon", round2(longitude))
                            .build())
                    .header(HttpHeaders.USER_AGENT, userAgent)
                    .retrieve()
                    .body(MetNorwayResponse.class);
            if (response == null) {
                throw new ExternalServiceException("날씨 정보를 불러오지 못했습니다.");
            }
            return MetNorwayMapper.toOpenMeteo(response, clock.instant(), DAYS);
        } catch (RestClientException | IllegalArgumentException e) {
            throw new ExternalServiceException("날씨 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", e);
        }
    }

    private static double round2(double value) {
        return Math.round(value * 100) / 100.0;
    }
}
