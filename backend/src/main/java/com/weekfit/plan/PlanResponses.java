package com.weekfit.plan;

import com.weekfit.closet.ClothingResponse;
import com.weekfit.schedule.Tpo;
import com.weekfit.weather.DailyWeather;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class PlanResponses {

    private PlanResponses() {
    }

    public record OutfitItem(OutfitSlot slot, ClothingResponse item) {
    }

    public record OutfitView(List<OutfitItem> items, int warmth) {
    }

    public record EventView(UUID id, String title, OffsetDateTime startsAt, Tpo tpo) {
    }

    public record DayPlan(
            LocalDate date,
            Tpo tpo,
            List<EventView> events,
            DailyWeather weather,
            int requiredWarmth,
            OutfitView outfit,
            String reason,
            String layeringTip,
            List<String> warnings) {
    }

    public record WeekPlan(
            LocalDate startDate,
            List<DayPlan> days,
            List<LaundryTask> laundryTasks,
            List<String> conflicts,
            boolean aiAvailable) {
    }
}
