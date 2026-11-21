package com.weekfit.plan;

import com.weekfit.closet.Category;
import com.weekfit.closet.ItemStatus;
import com.weekfit.schedule.ActivityLevel;
import com.weekfit.schedule.AnalysisSource;
import com.weekfit.schedule.EventAnalysis;
import com.weekfit.schedule.Tpo;
import com.weekfit.weather.DailyWeather;
import com.weekfit.weather.WeatherCondition;
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
