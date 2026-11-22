package com.weekfit.plan;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

/** 규칙 엔진의 결과를 자연어로 설명한다. LLM 실패 시 규칙 근거를 이어 붙인 문장을 쓴다. */
@Component
public class PlanExplainer {

    private static final Logger log = LoggerFactory.getLogger(PlanExplainer.class);

    public record Text(String reason, String layeringTip) {
    }

    public record Explanations(Map<LocalDate, Text> byDate, boolean aiAvailable) {
    }

    record AiDay(String date, String reason, String layeringTip) {
    }

    record AiDays(List<AiDay> days) {
    }

    /** 옷장·일정·날씨가 그대로면 AI 입력도 같으므로, 입력 해시로 설명을 재사용한다. */
    static final Duration CACHE_TTL = Duration.ofHours(6);
    private static final int MAX_CACHE = 500;

    private record Cached(Instant at, Map<LocalDate, Text> texts) {
    }

    private final ChatClient chatClient;
    private final Resource systemPrompt;
    private final Clock clock;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    public PlanExplainer(ChatClient chatClient, @Value("classpath:prompts/plan-explanation.st") Resource systemPrompt,
            Clock clock) {
        this.chatClient = chatClient;
        this.systemPrompt = systemPrompt;
        this.clock = clock;
    }

    public Explanations explain(List<WeeklyPlanner.DayResult> days, List<LaundryTask> tasks) {
        Map<LocalDate, Text> fallback = new HashMap<>();
        days.forEach(d -> fallback.put(d.context().date(), template(d)));
        String plan = toJson(days, tasks);
        String key = sha256(plan);
        Instant now = clock.instant();

        Cached hit = cache.get(key);
        if (hit != null && now.isBefore(hit.at().plus(CACHE_TTL))) {
            return new Explanations(merge(fallback, hit.texts()), true);
        }
        try {
            AiDays response = chatClient.prompt()
                    .system(systemPrompt)
                    .user(u -> u.text("코디 결과(JSON): {plan}").param("plan", plan))
                    .call()
                    .entity(AiDays.class);
            if (response == null || response.days() == null) {
                return new Explanations(fallback, false);
            }
            Map<LocalDate, Text> aiTexts = new HashMap<>();
            for (AiDay day : response.days()) {
                LocalDate date = parse(day.date());
                if (date != null && fallback.containsKey(date) && day.reason() != null && !day.reason().isBlank()) {
                    aiTexts.put(date, new Text(cut(day.reason()), day.layeringTip() == null ? null : cut(day.layeringTip())));
                }
            }
            remember(key, new Cached(now, Map.copyOf(aiTexts)));
            return new Explanations(merge(fallback, aiTexts), true);
        } catch (RuntimeException e) {
            log.warn("Plan explanation by AI failed, using templates: {}", e.toString());
            return new Explanations(fallback, false);
        }
    }

    private static Map<LocalDate, Text> merge(Map<LocalDate, Text> fallback, Map<LocalDate, Text> aiTexts) {
        Map<LocalDate, Text> result = new HashMap<>(fallback);
        result.putAll(aiTexts);
        return result;
    }

    private void remember(String key, Cached value) {
        if (cache.size() >= MAX_CACHE) {
            Instant now = value.at();
            cache.entrySet().removeIf(e -> !now.isBefore(e.getValue().at().plus(CACHE_TTL)));
            if (cache.size() >= MAX_CACHE) {
                cache.clear();
            }
        }
        cache.put(key, value);
    }

    private static String sha256(String text) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    static Text template(WeeklyPlanner.DayResult day) {
        if (day.outfit() == null) {
            return new Text("입을 수 있는 상의·하의가 부족해 조합을 만들지 못했어요.", null);
        }
        String reason = day.outfit().reasons().isEmpty() ? "오늘 일정과 날씨에 무난한 조합이에요."
                : String.join(" ", day.outfit().reasons());
        String tip = null;
        DayContext c = day.context();
        if (c.layering() && c.weather() != null) {
            tip = String.format("체감 %.0f℃에서 %.0f℃까지 오르내려요. 낮에는 겉옷을 벗어 두세요.",
                    c.weather().apparentMin(), c.weather().apparentMax());
        } else if (c.wet()) {
            tip = "비·눈 예보가 있어요. 우산을 챙기세요.";
        }
        return new Text(reason, tip);
    }

    private static String toJson(List<WeeklyPlanner.DayResult> days, List<LaundryTask> tasks) {
        StringBuilder sb = new StringBuilder("{\"days\":[");
        for (int i = 0; i < days.size(); i++) {
            WeeklyPlanner.DayResult d = days.get(i);
            DayContext c = d.context();
            if (i > 0) {
                sb.append(',');
            }
            sb.append("{\"date\":\"").append(c.date()).append('"')
                    .append(",\"weekday\":\"").append(c.date().getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.KOREAN)).append('"')
                    .append(",\"tpo\":\"").append(c.tpo()).append('"')
                    .append(",\"events\":").append(strings(c.events().stream().map(DayContext.EventRef::title).toList()))
                    .append(",\"dressCode\":").append(q(c.dressCode()))
                    .append(",\"avoidColors\":").append(strings(List.copyOf(c.avoidColors())))
                    .append(",\"apparentMin\":").append(c.weather() == null ? "null" : Math.round(c.weather().apparentMin()))
                    .append(",\"apparentMax\":").append(c.weather() == null ? "null" : Math.round(c.weather().apparentMax()))
                    .append(",\"layering\":").append(c.layering())
                    .append(",\"wet\":").append(c.wet())
                    .append(",\"outfit\":").append(strings(d.outfit() == null ? List.of()
                            : d.outfit().garments().stream().map(Garment::displayName).toList()))
                    .append(",\"warnings\":").append(strings(d.warnings()))
                    .append('}');
        }
        sb.append("],\"laundry\":[");
        for (int i = 0; i < tasks.size(); i++) {
            LaundryTask t = tasks.get(i);
            if (i > 0) {
                sb.append(',');
            }
            sb.append("{\"forDate\":\"").append(t.forDate()).append("\",\"items\":").append(strings(t.itemNames()))
                    .append(",\"deadline\":\"").append(t.deadline().toLocalDateTime()).append("\"}");
        }
        return sb.append("]}").toString();
    }

    private static String strings(List<String> values) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(q(values.get(i)));
        }
        return sb.append(']').toString();
    }

    private static String q(String s) {
        return s == null ? "null" : "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private static LocalDate parse(String s) {
        try {
            return s == null ? null : LocalDate.parse(s.trim());
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static String cut(String s) {
        String t = s.strip();
        return t.length() > 300 ? t.substring(0, 300) : t;
    }
}
