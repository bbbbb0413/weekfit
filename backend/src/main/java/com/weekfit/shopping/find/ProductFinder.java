package com.weekfit.shopping.find;

import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.anthropic.AnthropicChatOptions;
import org.springframework.ai.anthropic.AnthropicWebSearchResult;
import org.springframework.ai.anthropic.AnthropicWebSearchTool;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.ResponseEntity;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.util.MimeTypeUtils;

/** Claude 웹 검색으로 비슷하고 더 싼 제품을 찾는다. 웹 검색은 Anthropic 전용이라 다른 공급자 설정에서는 호출하지 않는다. */
@Component
public class ProductFinder {

    static final String SEARCH_RESULTS_KEY = "web-search-results";
    private static final Logger log = LoggerFactory.getLogger(ProductFinder.class);
    private static final String DEFAULT_TEXT = "이 사진 속 옷과 비슷하고 더 싼 제품을 찾아줘";
    private static final int MAX_SEARCHES = 3;
    private static final Duration TIMEOUT = Duration.ofSeconds(60);

    /** @param searchedUrls 웹 검색 결과 URL. 메타데이터에 목록이 없으면 null */
    public record Found(FindAiResult result, Set<String> searchedUrls) {
    }

    private final ChatClient chatClient;
    private final Resource systemPrompt;
    private final boolean enabled;
    private final String model;

    public ProductFinder(ChatClient chatClient,
            @Value("classpath:prompts/product-find.st") Resource systemPrompt,
            @Value("${spring.ai.model.chat:anthropic}") String provider,
            @Value("${weekfit.shopping.find-model:}") String model) {
        this.chatClient = chatClient;
        this.systemPrompt = systemPrompt;
        this.enabled = "anthropic".equalsIgnoreCase(provider);
        this.model = model;
    }

    public boolean isEnabled() {
        return enabled;
    }

    /** @throws IllegalStateException 비활성 설정이거나 응답이 비었을 때. 호출 실패 예외는 그대로 던진다 */
    public Found find(String text, byte[] jpeg, List<String> domains) {
        if (!enabled) {
            throw new IllegalStateException("web search requires the anthropic provider");
        }
        AnthropicChatOptions.Builder options = AnthropicChatOptions.builder()
                .webSearchTool(AnthropicWebSearchTool.builder()
                        .allowedDomains(domains)
                        .maxUses(MAX_SEARCHES)
                        .build())
                .timeout(TIMEOUT);
        if (model != null && !model.isBlank()) {
            options.model(model);
        }
        String userText = text == null || text.isBlank() ? DEFAULT_TEXT : text;
        ResponseEntity<ChatResponse, FindAiResult> response = chatClient.prompt()
                .system(systemPrompt)
                .user(u -> {
                    u.text(userText);
                    if (jpeg != null) {
                        u.media(MimeTypeUtils.IMAGE_JPEG, new ByteArrayResource(jpeg));
                    }
                })
                .options(options)
                .call()
                .responseEntity(new LenientFindConverter());
        if (response.response() != null && response.response().getMetadata() != null) {
            var usage = response.response().getMetadata().getUsage();
            log.info("Product find usage model={} prompt={} completion={}", response.response().getMetadata().getModel(),
                    usage == null ? null : usage.getPromptTokens(), usage == null ? null : usage.getCompletionTokens());
        }
        if (response.entity() == null) {
            throw new IllegalStateException("empty response");
        }
        return new Found(response.entity(), searchedUrls(response.response()));
    }

    private static Set<String> searchedUrls(ChatResponse response) {
        if (response == null || response.getMetadata() == null) {
            return null;
        }
        Object raw = response.getMetadata().get(SEARCH_RESULTS_KEY);
        if (!(raw instanceof List<?> list)) {
            log.warn("No web search results in metadata (key {}), falling back to domain-only check", SEARCH_RESULTS_KEY);
            return null;
        }
        Set<String> urls = new HashSet<>();
        for (Object o : list) {
            if (o instanceof AnthropicWebSearchResult r && r.url() != null) {
                urls.add(r.url());
            }
        }
        log.debug("Web search returned {} result url(s)", urls.size());
        return urls;
    }
}
