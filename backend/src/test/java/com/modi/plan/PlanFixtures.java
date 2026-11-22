package com.modi.plan;

import com.modi.closet.Category;
import com.modi.closet.ItemStatus;
import com.modi.schedule.ActivityLevel;
import com.modi.schedule.AnalysisSource;
import com.modi.schedule.EventAnalysis;
import com.modi.schedule.Tpo;
import com.modi.weather.DailyWeather;
import com.modi.weather.WeatherCondition;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

final class PlanFixtures {

    private PlanFixtures() {
    }

    static Garment garment(String name, Category c, String color, int warmth, String style, int formality,
            int wears, int threshold) {
        return new Garment(UUID.nameUUIDFromBytes(name.getBytes()), name, c, List.of(color), warmth, List.of(style),
                formality, threshold, wears, ItemStatus.AVAILABLE, null);
    }

    static DailyWeather weather(LocalDate date, double apparentMin, double apparentMax) {
        return new DailyWeather(date, WeatherCondition.CLEAR, apparentMin, apparentMax, apparentMin, apparentMax, 0);
    }

    static DayContext.EventRef event(String title, Tpo tpo, int formality, int importance, List<String> avoid,
            LocalDate date) {
        EventAnalysis a = new EventAnalysis(tpo, formality, null, avoid, true, ActivityLevel.LOW, importance, 0.9,
                AnalysisSource.SEED, null);
        return new DayContext.EventRef(UUID.randomUUID(), title, date.atTime(12, 0).atOffset(java.time.ZoneOffset.ofHours(9)), a);
    }
}
