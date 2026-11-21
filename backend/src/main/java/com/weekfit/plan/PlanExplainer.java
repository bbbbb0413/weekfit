package com.weekfit.plan;

import java.time.LocalDate;
import java.time.format.TextStyle;
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

    private final ChatClient chatClient;
    private final Resource systemPrompt;

    public PlanExplainer(ChatClient chatClient, @Value("classpath:prompts/plan-explanation.st") Resource systemPrompt) {
        this.chatClient = chatClient;
        this.systemPrompt = systemPrompt;
    }

    public Explanations explain(List<WeeklyPlanner.DayResult> days, List<LaundryTask> tasks) {
        Map<LocalDate, Text> fallback = new HashMap<>();
        days.forEach(d -> fallback.put(d.context().date(), template(d)));
        try {
            AiDays response = chatClient.prompt()
                    .system(systemPrompt)
                    .user(u -> u.text("코디 결과(JSON): {plan}").param("plan", toJson(days, tasks)))
                    .call()
                    .entity(AiDays.class);
            if (response == null || response.days() == null) {
                return new Explanations(fallback, false);
            }
            Map<LocalDate, Text> result = new HashMap<>(fallback);
            for (AiDay day : response.days()) {
                LocalDate date = parse(day.date());
                if (date != null && result.containsKey(date) && day.reason() != null && !day.reason().isBlank()) {
                    result.put(date, new Text(cut(day.reason()), day.layeringTip() == null ? null : cut(day.layeringTip())));
                }
            }
            return new Explanations(result, true);
        } catch (RuntimeException e) {
            log.warn("Plan explanation by AI failed, using templates: {}", e.toString());
            return new Explanations(fallback, false);
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
