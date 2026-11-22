package com.modi.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.CallAdvisor;
import org.springframework.ai.chat.client.advisor.api.CallAdvisorChain;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatResponse;

/**
 * 모든 ChatClient 호출을 가로채 토큰 사용량을 기록한다. 기능 이름은 호출한 클래스 이름으로 정하므로
 * 기존 서비스 코드는 고치지 않아도 된다.
 */
public class UsageTrackingAdvisor implements CallAdvisor {

    private static final Logger log = LoggerFactory.getLogger(UsageTrackingAdvisor.class);
    private static final StackWalker WALKER = StackWalker.getInstance();

    private final AiUsageTracker tracker;

    public UsageTrackingAdvisor(AiUsageTracker tracker) {
        this.tracker = tracker;
    }

    @Override
    public ChatClientResponse adviseCall(ChatClientRequest request, CallAdvisorChain chain) {
        String feature = caller();
        long start = System.nanoTime();
        try {
            ChatClientResponse response = chain.nextCall(request);
            long millis = (System.nanoTime() - start) / 1_000_000;
            ChatResponse chat = response.chatResponse();
            Usage usage = chat == null ? null : chat.getMetadata().getUsage();
            long in = usage == null || usage.getPromptTokens() == null ? 0 : usage.getPromptTokens();
            long out = usage == null || usage.getCompletionTokens() == null ? 0 : usage.getCompletionTokens();
            String model = chat == null ? "" : chat.getMetadata().getModel();
            tracker.record(feature, model, in, out, millis, true);
            log.info("AI usage feature={} model={} in={} out={} {}ms", feature, model, in, out, millis);
            return response;
        } catch (RuntimeException e) {
            tracker.record(feature, "", 0, 0, (System.nanoTime() - start) / 1_000_000, false);
            throw e;
        }
    }

    // 호출 스택에서 ai 패키지 밖의 첫 com.modi 클래스 이름. 예: AvatarPaintService
    private static String caller() {
        return WALKER.walk(frames -> frames
                .map(StackWalker.StackFrame::getClassName)
                .filter(n -> n.startsWith("com.modi.") && !n.startsWith("com.modi.ai."))
                .findFirst()
                .map(n -> n.substring(n.lastIndexOf('.') + 1).replaceAll("\\$.*", ""))
                .orElse("unknown"));
    }

    @Override
    public String getName() {
        return "usageTracking";
    }

    @Override
    public int getOrder() {
        return 0;
    }
}
