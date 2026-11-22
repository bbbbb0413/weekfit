package com.modi.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI modiOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Modi API")
                .version("0.1.0")
                .description("""
                        코드 기준 자동 생성 명세이다. 설계 계약은 레포의 docs/openapi.yaml 을 기준으로 한다.
                        모든 응답은 { success, data, error } envelope 이며, 사용자 식별은 X-User-Id 헤더(UUID, 생략 시 데모 사용자)로 한다.
                        """));
    }
}
