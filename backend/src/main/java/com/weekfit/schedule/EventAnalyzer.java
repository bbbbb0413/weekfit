package com.weekfit.schedule;

import com.weekfit.ai.Vocabulary;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

/** 마스킹된 일정 텍스트를 LLM 으로 분석한다. 실패하면 키워드 규칙으로 대체한다. */
@Component
public class EventAnalyzer {

    private static final Logger log = LoggerFactory.getLogger(EventAnalyzer.class);
    private static final int BATCH_SIZE = 20;
    private static final double CLARIFY_BELOW = 0.5;

    /** LLM 에 보내는 일정. 마스킹된 텍스트와 시간 정보만 담는다. */
    public record Input(String maskedTitle, String maskedLocation, OffsetDateTime startsAt, OffsetDateTime endsAt) {
    }

    record AiResult(String id, String tpo, Integer formality, String dressCode, List<String> avoidColors,
            Boolean indoor, String activityLevel, Integer importance, Double confidence, String clarifyQuestion) {
    }

    record AiResults(List<AiResult> results) {
    }

    private final ChatClient chatClient;
    private final Resource systemPrompt;

    public EventAnalyzer(ChatClient chatClient, @Value("classpath:prompts/event-analysis.st") Resource systemPrompt) {
        this.chatClient = chatClient;
        this.systemPrompt = systemPrompt;
    }

    public List<EventAnalysis> analyze(List<Input> inputs) {
        List<EventAnalysis> results = new ArrayList<>(inputs.size());
        for (int from = 0; from < inputs.size(); from += BATCH_SIZE) {
            results.addAll(analyzeBatch(inputs.subList(from, Math.min(inputs.size(), from + BATCH_SIZE))));
        }
        return results;
    }

    private List<EventAnalysis> analyzeBatch(List<Input> batch) {
        Map<String, AiResult> byId = new HashMap<>();
        List<AiResult> ordered = List.of();
        try {
            AiResults response = chatClient.prompt()
                    .system(systemPrompt)
                    .user(u -> u.text("일정 목록(JSON): {events}").param("events", toJson(batch)))
                    .call()
                    .entity(AiResults.class);
            if (response != null && response.results() != null) {
                ordered = response.results().stream().filter(java.util.Objects::nonNull).toList();
                for (AiResult r : ordered) {
                    if (r.id() != null) {
                        byId.put(r.id().strip(), r);
                    }
                }
            }
        } catch (RuntimeException e) {
            log.warn("Event analysis by AI failed, falling back to rules: {}", e.toString());
        }
        boolean orderFallback = byId.isEmpty() && ordered.size() == batch.size();
        List<EventAnalysis> out = new ArrayList<>(batch.size());
        int matched = 0;
        for (int i = 0; i < batch.size(); i++) {
            Input in = batch.get(i);
            AiResult r = orderFallback ? ordered.get(i) : byId.get(idOf(i));
            if (r != null) {
                matched++;
            }
            out.add(r == null ? RuleBasedEventClassifier.classify(in.maskedTitle(), in.maskedLocation()) : sanitize(r, in));
        }
        if (matched < batch.size()) {
            log.warn("Event analysis matched {}/{} events (AI returned {} results, ids={})",
                    matched, batch.size(), ordered.size(), byId.keySet());
        }
        return out;
    }

    static String idOf(int i) {
        return "e" + (i + 1);
    }

    private static EventAnalysis sanitize(AiResult r, Input in) {
        EventAnalysis rule = RuleBasedEventClassifier.classify(in.maskedTitle(), in.maskedLocation());
        Tpo tpo = Tpo.parseOrNull(r.tpo());
        if (tpo == null) {
            log.warn("AI returned unknown tpo '{}' for event {}, using rules", r.tpo(), r.id());
            return rule;
        }
        double confidence = r.confidence() == null ? 0.5 : Math.max(0, Math.min(1, r.confidence()));
        String question = confidence < CLARIFY_BELOW
                ? (blank(r.clarifyQuestion()) ? rule.clarifyQuestion() : cut(r.clarifyQuestion(), 200))
                : null;
        return new EventAnalysis(
                tpo,
                clamp(r.formality(), tpo.defaultFormality()),
                cut(r.dressCode(), 100),
                Vocabulary.colors(r.avoidColors() == null ? List.of() : r.avoidColors()),
                r.indoor(),
                ActivityLevel.parseOr(r.activityLevel(), ActivityLevel.LOW),
                clamp(r.importance(), tpo.defaultImportance()),
                confidence,
                AnalysisSource.AI,
                question);
    }

    private static String toJson(List<Input> batch) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < batch.size(); i++) {
            Input in = batch.get(i);
            double hours = Duration.between(in.startsAt(), in.endsAt()).toMinutes() / 60.0;
            if (i > 0) {
                sb.append(',');
            }
            sb.append("{\"id\":\"").append(idOf(i)).append('"')
                    .append(",\"title\":").append(quote(in.maskedTitle()))
                    .append(",\"location\":").append(quote(in.maskedLocation()))
                    .append(",\"weekday\":").append(quote(in.startsAt().getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.KOREAN)))
                    .append(",\"startTime\":").append(quote(in.startsAt().toLocalTime().toString()))
                    .append(",\"durationHours\":").append(Math.round(hours * 10) / 10.0)
                    .append('}');
        }
        return sb.append(']').toString();
    }

    private static String quote(String s) {
        if (s == null) {
            return "null";
        }
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ") + "\"";
    }

    private static int clamp(Integer v, int fallback) {
        return v == null ? fallback : Math.max(1, Math.min(5, v));
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static String cut(String s, int max) {
        if (blank(s)) {
            return null;
        }
        String t = s.strip();
        return t.length() > max ? t.substring(0, max) : t;
    }
}
