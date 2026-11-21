package com.weekfit.outfit;

import static org.assertj.core.api.Assertions.assertThat;

import com.weekfit.closet.Category;
import com.weekfit.closet.ItemStatus;
import com.weekfit.plan.DayContext;
import com.weekfit.plan.Garment;
import com.weekfit.schedule.ActivityLevel;
import com.weekfit.schedule.AnalysisSource;
import com.weekfit.schedule.EventAnalysis;
import com.weekfit.schedule.Tpo;
import com.weekfit.weather.DailyWeather;
import com.weekfit.weather.WeatherCondition;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class OutfitRulesTest {

    private static final LocalDate DAY = LocalDate.of(2026, 11, 28);
    private static final Instant WEAR = Instant.parse("2026-11-27T23:00:00Z");

    private static Garment g(String name, Category c, String color, int warmth, int formality) {
        return new Garment(UUID.nameUUIDFromBytes(name.getBytes()), name, c, List.of(color), warmth, List.of("포멀"),
                formality, 2, 0, ItemStatus.AVAILABLE, null);
    }

    private static DayContext wedding(double min, double max) {
        EventAnalysis a = new EventAnalysis(Tpo.FORMAL, 4, "하객 세미정장", List.of("화이트"), true, ActivityLevel.LOW, 5,
                0.9, AnalysisSource.SEED, null);
        DayContext.EventRef e = new DayContext.EventRef(UUID.randomUUID(), "[이름] 결혼식",
                DAY.atTime(12, 0).atOffset(ZoneOffset.ofHours(9)), a);
        DailyWeather w = new DailyWeather(DAY, WeatherCondition.CLEAR, min, max, min, max, 0);
        return DayContext.of(DAY, List.of(e), w, 0, null);
    }

    private final Garment white = g("화이트 셔츠", Category.TOP, "화이트", 2, 4);
    private final Garment navy = g("네이비 셔츠", Category.TOP, "네이비", 2, 4);
    private final Garment slacks = g("블랙 슬랙스", Category.BOTTOM, "블랙", 3, 4);
    private final Garment coat = g("네이비 코트", Category.OUTER, "네이비", 5, 4);

    @Test
    void penalizesAvoidedColorAndSuggestsReplacement() {
        OutfitRules.Result r = OutfitRules.evaluate(List.of(white, slacks, coat), wedding(-2, 4),
                List.of(white, navy, slacks, coat), WEAR);

        assertThat(r.checks().tpo().score()).isLessThanOrEqualTo(30);
        assertThat(r.checks().tpo().message()).contains("화이트");
        assertThat(r.suggestions()).anySatisfy(s -> {
            assertThat(s.replaceItemId()).isEqualTo(white.id());
            assertThat(s.withItemId()).isEqualTo(navy.id());
        });
    }

    @Test
    void suggestsOuterWhenTooThin() {
        OutfitRules.Result r = OutfitRules.evaluate(List.of(navy, slacks), wedding(-6, 1),
                List.of(navy, slacks, coat), WEAR);

        assertThat(r.checks().weather().ok()).isFalse();
        assertThat(r.suggestions()).anySatisfy(s -> {
            assertThat(s.replaceItemId()).isNull();
            assertThat(s.withItemId()).isEqualTo(coat.id());
        });
    }

    @Test
    void goodOutfitScoresHigh() {
        OutfitRules.Result r = OutfitRules.evaluate(List.of(navy, slacks, coat), wedding(-6, 1),
                List.of(navy, slacks, coat), WEAR);

        int total = OutfitRules.total(r.checks());
        assertThat(total).isGreaterThanOrEqualTo(85);
        assertThat(OutfitRules.grade(total)).isEqualTo("GREAT");
        assertThat(r.structureWarnings()).isEmpty();
    }

    @Test
    void laundryItemFailsLaundryCheck() {
        Garment dirty = new Garment(UUID.randomUUID(), "세탁 대기 셔츠", Category.TOP, List.of("네이비"), 2, List.of(),
                4, 2, 2, ItemStatus.LAUNDRY, null);

        OutfitRules.Result r = OutfitRules.evaluate(List.of(dirty, slacks), wedding(14, 18), List.of(dirty, slacks), WEAR);

        assertThat(r.checks().laundry().score()).isZero();
    }
}
