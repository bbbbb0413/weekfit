package com.modi.plan;

import com.modi.common.cache.TtlCache;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

/** 규칙 엔진의 결과를 자연어로 설명한다. LLM 실패 시 규칙 근거를 이어 붙인 문장을 쓴다. */
@Component
public class PlanExplainer {

    private static final Logger log = LoggerFactory.getLogger(PlanExplainer.class);

    public record Text(String reason, String layeringTip) {
    }

    /** pending 이 true 면 지금은 규칙 문장이고, AI 설명을 백그라운드에서 만드는 중이다. */
    public record Explanations(Map<LocalDate, Text> byDate, boolean aiAvailable, boolean pending) {
        public Explanations(Map<LocalDate, Text> byDate, boolean aiAvailable) {
            this(byDate, aiAvailable, false);
        }
    }

    record AiDay(String date, String reason, String layeringTip) {
    }

    record AiDays(List<AiDay> days) {
    }

    /** 옷장·일정·날씨가 그대로면 AI 입력도 같으므로, 입력 해시로 설명을 재사용한다. */
    static final Duration CACHE_TTL = Duration.ofHours(6);
    private static final int MAX_CACHE = 500;

    /** 백그라운드 생성이 실패한 입력은 이 시간 동안 다시 시도하지 않는다. 화면이 계속 다시 물어도 AI 를 반복 호출하지 않게 한다. */
    static final Duration FAILURE_BACKOFF = Duration.ofMinutes(5);

    private final ChatClient chatClient;
    private final Resource systemPrompt;
    private final Clock clock;
    private final Executor background;
    private final TtlCache<Map<LocalDate, Text>> cache = new TtlCache<>(CACHE_TTL, MAX_CACHE);
    private final Set<String> inFlight = ConcurrentHashMap.newKeySet();
    private final Map<String, Instant> failedUntil = new ConcurrentHashMap<>();

    @Autowired
    public PlanExplainer(ChatClient chatClient, @Value("classpath:prompts/plan-explanation.st") Resource systemPrompt,
            Clock clock) {
        this(chatClient, systemPrompt, clock, Executors.newVirtualThreadPerTaskExecutor());
    }

    PlanExplainer(ChatClient chatClient, Resource systemPrompt, Clock clock, Executor background) {
        this.chatClient = chatClient;
        this.systemPrompt = systemPrompt;
        this.clock = clock;
        this.background = background;
    }

    /** AI 설명을 기다렸다가 돌려준다. 사용자가 버튼을 눌러 기다리는 하루 추천에 쓴다. */
    public Explanations explain(List<WeeklyPlanner.DayResult> days, List<LaundryTask> tasks) {
        Map<LocalDate, Text> fallback = templates(days);
        String plan = toJson(days, tasks);
        String key = sha256(plan);
        Map<LocalDate, Text> hit = cached(key, clock.instant());
        if (hit != null) {
            return new Explanations(merge(fallback, hit), true);
        }
        try {
            Map<LocalDate, Text> aiTexts = askAi(plan, fallback);
            if (aiTexts == null) {
                return new Explanations(fallback, false);
            }
            cache.put(key, aiTexts, clock.instant());
            return new Explanations(merge(fallback, aiTexts), true);
        } catch (RuntimeException e) {
            log.warn("Plan explanation by AI failed, using templates: {}", e.toString());
            return new Explanations(fallback, false);
        }
    }

    /**
     * 캐시에 있으면 AI 설명을, 없으면 규칙 문장을 바로 돌려주고 AI 설명은 백그라운드에서 만든다.
     * 주간 계획은 일정·옷이 바뀔 때마다 다시 계산되므로, 코디를 먼저 보여 주고 설명은 다음 조회에서 채운다.
     */
    public Explanations explainInBackground(List<WeeklyPlanner.DayResult> days, List<LaundryTask> tasks) {
        Map<LocalDate, Text> fallback = templates(days);
        String plan = toJson(days, tasks);
        String key = sha256(plan);
        Instant now = clock.instant();
        Map<LocalDate, Text> hit = cached(key, now);
        if (hit != null) {
            return new Explanations(merge(fallback, hit), true);
        }
        Instant retryAt = failedUntil.get(key);
        if (retryAt != null && now.isBefore(retryAt)) {
            return new Explanations(fallback, false);
        }
        if (inFlight.add(key)) {
            background.execute(() -> generate(key, plan, fallback));
        }
        return new Explanations(fallback, false, true);
    }

    private void generate(String key, String plan, Map<LocalDate, Text> fallback) {
        try {
            Map<LocalDate, Text> aiTexts = askAi(plan, fallback);
            if (aiTexts == null) {
                failedUntil.put(key, clock.instant().plus(FAILURE_BACKOFF));
            } else {
                failedUntil.remove(key);
                cache.put(key, aiTexts, clock.instant());
            }
        } catch (RuntimeException e) {
            log.warn("Background plan explanation failed, keeping templates: {}", e.toString());
            failedUntil.put(key, clock.instant().plus(FAILURE_BACKOFF));
        } finally {
            inFlight.remove(key);
        }
    }

    /** AI 가 쓴 날짜별 설명. 응답이 비면 null 이다. */
    private Map<LocalDate, Text> askAi(String plan, Map<LocalDate, Text> fallback) {
        AiDays response = chatClient.prompt()
                .system(systemPrompt)
                .user(u -> u.text("코디 결과(JSON): {plan}").param("plan", plan))
                .call()
                .entity(AiDays.class);
        if (response == null || response.days() == null) {
            return null;
        }
        Map<LocalDate, Text> aiTexts = new HashMap<>();
        for (AiDay day : response.days()) {
            LocalDate date = parse(day.date());
            if (date != null && fallback.containsKey(date) && day.reason() != null && !day.reason().isBlank()) {
                aiTexts.put(date, new Text(cut(day.reason()), day.layeringTip() == null ? null : cut(day.layeringTip())));
            }
        }
        return Map.copyOf(aiTexts);
    }

    private Map<LocalDate, Text> cached(String key, Instant now) {
        return cache.get(key, now);
    }

    private static Map<LocalDate, Text> templates(List<WeeklyPlanner.DayResult> days) {
        Map<LocalDate, Text> fallback = new HashMap<>();
        days.forEach(d -> fallback.put(d.context().date(), template(d)));
        return fallback;
    }

    private static Map<LocalDate, Text> merge(Map<LocalDate, Text> fallback, Map<LocalDate, Text> aiTexts) {
        Map<LocalDate, Text> result = new HashMap<>(fallback);
        result.putAll(aiTexts);
        return result;
    }

    private static String sha256(String text) {
        return TtlCache.sha256(text);
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
