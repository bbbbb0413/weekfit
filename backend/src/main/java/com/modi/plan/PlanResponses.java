package com.modi.plan;

import com.modi.closet.ClothingResponse;
import com.modi.schedule.Tpo;
import com.modi.weather.DailyWeather;
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
            boolean aiAvailable,
            /** true 면 설명이 아직 규칙 문장이고 AI 설명을 만드는 중이다. 잠시 뒤 다시 조회하면 채워진다 */
            boolean explanationPending) {
    }
}
