package com.modi.ai;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 외부 LLM 호출 진입점. 기능별 서비스(closet 태깅, schedule 분석, plan 설명)는
 * 이 ChatClient를 주입받아 사용하고, 프롬프트는 resources/prompts 에 둔다.
 */
@Configuration
public class AiConfig {

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder) {
        return builder.build();
    }
}
