package com.weekfit.shopping;

import com.weekfit.common.error.ExternalServiceException;
import java.time.Duration;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
class NaverShoppingClient {

    private static final String BASE_URL = "https://openapi.naver.com";
    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final int DISPLAY = 40;

    private final RestClient restClient;
    private final String clientId;
    private final String clientSecret;

    NaverShoppingClient(RestClient.Builder builder,
            @Value("${weekfit.shopping.naver.client-id:}") String clientId,
            @Value("${weekfit.shopping.naver.client-secret:}") String clientSecret) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(TIMEOUT);
        factory.setReadTimeout(TIMEOUT);
        this.restClient = builder.baseUrl(BASE_URL).requestFactory(factory).build();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    List<NaverShopResponse.Item> search(String query) {
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            throw new ExternalServiceException("쇼핑 검색 키가 설정되지 않았습니다. NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 을 확인해 주세요.");
        }
        try {
            NaverShopResponse response = restClient.get()
                    .uri(uri -> uri.path("/v1/search/shop.json")
                            .queryParam("query", query)
                            .queryParam("display", DISPLAY)
                            .queryParam("sort", "sim")
                            .build())
                    .header("X-Naver-Client-Id", clientId)
                    .header("X-Naver-Client-Secret", clientSecret)
                    .retrieve()
                    .body(NaverShopResponse.class);
            return response == null || response.items() == null ? List.of() : response.items();
        } catch (RestClientException e) {
            throw new ExternalServiceException("쇼핑 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.", e);
        }
    }
}
