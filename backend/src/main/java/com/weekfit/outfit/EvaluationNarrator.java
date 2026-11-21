package com.weekfit.outfit;

import com.weekfit.plan.DayContext;
import com.weekfit.plan.Garment;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

/** 색 조합 평가와 총평을 LLM 으로 쓴다. 실패하면 비어 있는 결과를 돌려준다. */
@Component
public class EvaluationNarrator {

    private static final Logger log = LoggerFactory.getLogger(EvaluationNarrator.class);

    public record Narrative(Integer colorScore, String colorComment, String summary) {
    }

    private final ChatClient chatClient;
    private final Resource systemPrompt;

    public EvaluationNarrator(ChatClient chatClient, @Value("classpath:prompts/outfit-evaluation.st") Resource systemPrompt) {
        this.chatClient = chatClient;
        this.systemPrompt = systemPrompt;
    }

    public Optional<Narrative> narrate(List<Garment> outfit, DayContext ctx, OutfitRules.Result rules) {
        StringBuilder sb = new StringBuilder();
        sb.append("자리: ").append(ctx.tpo()).append(ctx.dressCode() == null ? "" : " / " + ctx.dressCode()).append('\n');
        if (!ctx.avoidColors().isEmpty()) {
            sb.append("피할 색: ").append(String.join(", ", ctx.avoidColors())).append('\n');
        }
        if (ctx.weather() != null) {
            sb.append(String.format("체감 온도: %.0f~%.0f℃%n", ctx.weather().apparentMin(), ctx.weather().apparentMax()));
        }
        sb.append("옷:\n");
        for (Garment g : outfit) {
            sb.append("- ").append(g.displayName()).append(" (").append(g.category()).append(", 색 ")
                    .append(String.join("/", g.colors())).append(", 스타일 ").append(String.join("/", g.styles()))
                    .append(", 격식 ").append(g.formality()).append(")\n");
        }
        OutfitRules.Checks c = rules.checks();
        sb.append(String.format("규칙 점수: 날씨 %d(%s), 자리 %d(%s), 세탁 %d(%s)%n",
                c.weather().score(), c.weather().message(), c.tpo().score(), c.tpo().message(),
                c.laundry().score(), c.laundry().message()));
        String text = sb.toString();
        try {
            Narrative n = chatClient.prompt()
                    .system(systemPrompt)
                    .user(u -> u.text("{input}").param("input", text))
                    .call()
                    .entity(Narrative.class);
            return Optional.ofNullable(n);
        } catch (RuntimeException e) {
            log.warn("Outfit narration by AI failed: {}", e.toString());
            return Optional.empty();
        }
    }
}
