package com.weekfit.weather;

import com.weekfit.common.error.ExternalServiceException;
import java.time.Duration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
class OpenMeteoClient {

    private static final String BASE_URL = "https://api.open-meteo.com";
    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    private final RestClient restClient;

    OpenMeteoClient(RestClient.Builder builder) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(TIMEOUT);
        factory.setReadTimeout(TIMEOUT);
        this.restClient = builder.baseUrl(BASE_URL).requestFactory(factory).build();
    }

    OpenMeteoResponse forecast(double latitude, double longitude) {
        try {
            OpenMeteoResponse response = restClient.get()
                    .uri(uri -> uri.path("/v1/forecast")
                            .queryParam("latitude", latitude)
                            .queryParam("longitude", longitude)
                            .queryParam("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m")
                            .queryParam("hourly", "temperature_2m,apparent_temperature,precipitation_probability,weather_code")
                            .queryParam("daily", "weather_code,temperature_2m_max,temperature_2m_min,"
                                    + "apparent_temperature_max,apparent_temperature_min,precipitation_probability_max")
                            .queryParam("timezone", "Asia/Seoul")
                            .queryParam("forecast_days", 7)
                            .build())
                    .retrieve()
                    .body(OpenMeteoResponse.class);
            if (response == null || response.current() == null || response.daily() == null) {
                throw new ExternalServiceException("날씨 정보를 불러오지 못했습니다.");
            }
            return response;
        } catch (RestClientException e) {
            throw new ExternalServiceException("날씨 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", e);
        }
    }
}
