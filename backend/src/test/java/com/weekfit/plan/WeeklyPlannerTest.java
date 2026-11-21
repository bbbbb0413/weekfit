package com.weekfit.plan;

import static com.weekfit.plan.PlanFixtures.event;
import static com.weekfit.plan.PlanFixtures.garment;
import static com.weekfit.plan.PlanFixtures.weather;
import static org.assertj.core.api.Assertions.assertThat;

import com.weekfit.closet.Category;
import com.weekfit.schedule.Tpo;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class WeeklyPlannerTest {

    private static final LocalDate MON = LocalDate.of(2026, 11, 23);
    private static final Instant NOW = Instant.parse("2026-11-22T00:00:00Z");

    private final WeeklyPlanner planner = new WeeklyPlanner(new OutfitSelector());

    private final Garment whiteShirt = garment("화이트 셔츠", Category.TOP, "화이트", 2, "포멀", 4, 0, 2);
    private final Garment navyShirt = garment("네이비 셔츠", Category.TOP, "네이비", 2, "포멀", 4, 2, 2);
    private final Garment tee = garment("그레이 티", Category.TOP, "그레이", 2, "캐주얼", 2, 0, 2);
    private final Garment knit = garment("블랙 니트", Category.TOP, "블랙", 3, "미니멀", 3, 0, 4);
    private final Garment slacks = garment("블랙 슬랙스", Category.BOTTOM, "블랙", 3, "포멀", 4, 0, 5);
    private final Garment jeans = garment("청바지", Category.BOTTOM, "블루", 3, "캐주얼", 2, 0, 8);
    private final Garment coat = garment("네이비 코트", Category.OUTER, "네이비", 5, "포멀", 4, 0, 15);

    private List<Garment> closet() {
        return List.of(whiteShirt, navyShirt, tee, knit, slacks, jeans, coat);
    }

    private List<DayContext> weekWithWeddingOn(LocalDate wedding) {
        List<DayContext> days = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate d = MON.plusDays(i);
            List<DayContext.EventRef> events = d.equals(wedding)
                    ? List.of(event("[이름] 결혼식", Tpo.FORMAL, 4, 5, List.of("화이트"), d))
                    : List.of();
            days.add(DayContext.of(d, events, weather(d, 14, 18), 0, null));
        }
        return days;
    }

    @Test
    void weddingAvoidsWhiteAndSchedulesLaundryForReservedShirt() {
        LocalDate wedding = MON.plusDays(5);

        WeeklyPlanner.Result result = planner.plan(weekWithWeddingOn(wedding), closet(), NOW);

        WeeklyPlanner.DayResult weddingDay = result.days().stream().filter(d -> d.context().date().equals(wedding))
                .findFirst().orElseThrow();
        assertThat(weddingDay.outfit().in(OutfitSlot.TOP)).contains(navyShirt);
        assertThat(result.laundryTasks()).anySatisfy(task -> {
            assertThat(task.itemIds()).contains(navyShirt.id());
            assertThat(task.forDate()).isEqualTo(wedding);
            assertThat(task.deadline().toInstant()).isEqualTo(WeeklyPlanner.wearInstant(wedding).minus(Category.TOP.defaultDryTime()));
        });
    }

    @Test
    void reservedShirtIsNotWornInTheThreeDaysBefore() {
        LocalDate wedding = MON.plusDays(5);

        WeeklyPlanner.Result result = planner.plan(weekWithWeddingOn(wedding), closet(), NOW);

        result.days().stream()
                .filter(d -> d.context().date().isAfter(wedding.minusDays(4)) && d.context().date().isBefore(wedding))
                .forEach(d -> assertThat(d.outfit().garments()).doesNotContain(navyShirt));
    }

    @Test
    void sameTopIsNotWornOnConsecutiveDays() {
        WeeklyPlanner.Result result = planner.plan(weekWithWeddingOn(LocalDate.MIN), closet(), NOW);

        for (int i = 1; i < result.days().size(); i++) {
            Garment prev = result.days().get(i - 1).outfit().in(OutfitSlot.TOP).orElseThrow();
            Garment cur = result.days().get(i).outfit().in(OutfitSlot.TOP).orElseThrow();
            assertThat(cur).isNotEqualTo(prev);
        }
    }

    @Test
    void reportsConflictWhenThereIsNoTimeToDry() {
        LocalDate tomorrow = LocalDate.of(2026, 11, 23);
        Instant lateNight = Instant.parse("2026-11-22T14:00:00Z"); // 11/22 23:00 KST
        List<DayContext> days = List.of(DayContext.of(tomorrow,
                List.of(event("[이름] 결혼식", Tpo.FORMAL, 4, 5, List.of("화이트"), tomorrow)),
                weather(tomorrow, 14, 18), 0, null));

        WeeklyPlanner.Result result = planner.plan(days, List.of(whiteShirt, navyShirt, slacks), lateNight);

        assertThat(result.conflicts()).singleElement().asString().contains("네이비 셔츠");
        assertThat(result.laundryTasks()).isEmpty();
    }

    @Test
    void addsOuterWhenCold() {
        LocalDate d = MON;
        List<DayContext> days = List.of(DayContext.of(d, List.of(), weather(d, -6, 1), 0, null));

        WeeklyPlanner.Result result = planner.plan(days, closet(), NOW);

        assertThat(result.days().getFirst().outfit().in(OutfitSlot.OUTER)).contains(coat);
        assertThat(result.days().getFirst().outfit().warmth()).isEqualTo(5);
    }

    @Test
    void warnsWhenNoOutfitPossible() {
        List<DayContext> days = List.of(DayContext.of(MON, List.of(), weather(MON, 14, 18), 0, null));

        WeeklyPlanner.Result result = planner.plan(days, List.of(tee), NOW);

        assertThat(result.days().getFirst().outfit()).isNull();
        assertThat(result.days().getFirst().warnings()).isNotEmpty();
    }
}
