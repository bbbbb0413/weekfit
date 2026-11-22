package com.modi.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.util.MimeTypeUtils;

/** 옷 사진 한 장을 분석한다. 옷장 등록, 가성비 찾기, 보유 검사가 함께 쓴다. */
@Component
public class ClothingVisionAnalyzer {

    private static final Logger log = LoggerFactory.getLogger(ClothingVisionAnalyzer.class);
    private static final String USER_TEXT = "이 사진 속 옷의 속성을 규칙에 맞춰 추출해 주세요.";

    private final ChatClient chatClient;
    private final Resource systemPrompt;

    public ClothingVisionAnalyzer(ChatClient chatClient,
            @Value("classpath:prompts/clothing-vision.st") Resource systemPrompt) {
        this.chatClient = chatClient;
        this.systemPrompt = systemPrompt;
    }

    /**
     * @param jpeg {@code ImageNormalizer} 를 거친 JPEG
     * @throws AiUnavailableException LLM 호출이나 응답 파싱에 실패한 경우
     */
    public ClothingAttributes analyze(byte[] jpeg) {
        try {
            ClothingAttributes result = chatClient.prompt()
                    .system(systemPrompt)
                    .user(u -> u.text(USER_TEXT).media(MimeTypeUtils.IMAGE_JPEG, new ByteArrayResource(jpeg)))
                    .call()
                    .entity(ClothingAttributes.class);
            if (result == null) {
                throw new IllegalStateException("empty response");
            }
            return result;
        } catch (RuntimeException e) {
            log.warn("Clothing vision analysis failed: {}", e.toString());
            throw new AiUnavailableException(e);
        }
    }
}
