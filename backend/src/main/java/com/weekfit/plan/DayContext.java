package com.weekfit.plan;

import com.weekfit.schedule.ActivityLevel;
import com.weekfit.schedule.EventAnalysis;
import com.weekfit.schedule.Tpo;
import com.weekfit.weather.DailyWeather;
import com.weekfit.weather.WarmthRules;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** 하루치 코디 조건. 그날 일정과 예보를 합쳐 만든다. */
public record DayContext(
        LocalDate date,
        List<EventRef> events,
        Tpo tpo,
        int targetFormality,
        List<String> preferredStyles,
        Set<String> avoidColors,
        String dressCode,
        int importance,
        ActivityLevel activity,
        DailyWeather weather,
        int requiredWarmth,
        boolean layering,
        boolean wet) {

    private static final int DEFAULT_WARMTH = 3;

    public record EventRef(UUID id, String title, OffsetDateTime startsAt, EventAnalysis analysis) {
    }

    public static DayContext of(LocalDate date, List<EventRef> events, DailyWeather weather, int warmthBias, Tpo override) {
        EventRef primary = events.stream()
                .max(Comparator.comparingInt((EventRef e) -> e.analysis().importance())
                        .thenComparingInt(e -> e.analysis().formality()))
                .orElse(null);
        Tpo tpo = override != null ? override : primary != null ? primary.analysis().tpo() : Tpo.DAILY;
        int formality = override != null || primary == null
                ? tpo.defaultFormality()
                : events.stream().mapToInt(e -> e.analysis().formality()).max().orElse(tpo.defaultFormality());
        int importance = override != null || primary == null
                ? tpo.defaultImportance()
                : events.stream().mapToInt(e -> e.analysis().importance()).max().orElse(1);
        Set<String> avoid = new LinkedHashSet<>();
        events.forEach(e -> avoid.addAll(e.analysis().avoidColors()));
        ActivityLevel activity = events.stream().map(e -> e.analysis().activityLevel())
                .max(Comparator.naturalOrder()).orElse(override == Tpo.EXERCISE || override == Tpo.OUTDOOR
                        ? ActivityLevel.HIGH : ActivityLevel.LOW);

        int required = weather == null
                ? Math.max(1, Math.min(5, DEFAULT_WARMTH + warmthBias))
                : WarmthRules.requiredWarmth(weather, warmthBias);
        if (activity == ActivityLevel.HIGH) {
            required = Math.max(1, required - 1);
        }
        boolean layering = weather != null && WarmthRules.needsLayering(weather);
        boolean wet = weather != null && (weather.condition().isWet()
                || weather.precipitationProbabilityMax() >= WarmthRules.RAIN_ALERT_PROBABILITY);
        String dressCode = primary == null || override != null ? null : primary.analysis().dressCode();
        return new DayContext(date, List.copyOf(new ArrayList<>(events)), tpo, formality, tpo.preferredStyles(),
                Set.copyOf(avoid), dressCode, importance, activity, weather, required, layering, wet);
    }

    public boolean important() {
        return importance >= 4;
    }
}
