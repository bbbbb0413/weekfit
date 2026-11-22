package com.modi.plan;

import static com.modi.plan.PlanFixtures.garment;
import static com.modi.plan.PlanFixtures.weather;
import static org.assertj.core.api.Assertions.assertThat;

import com.modi.closet.Category;
import com.modi.schedule.Tpo;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class OutfitSelectorTest {

    private static final LocalDate DAY = LocalDate.of(2026, 11, 23);
    private final OutfitSelector selector = new OutfitSelector();

    @Test
    void anchorItemIsAlwaysIncluded() {
        Garment tee = garment("그레이 티", Category.TOP, "그레이", 2, "캐주얼", 2, 0, 2);
        Garment shirt = garment("화이트 셔츠", Category.TOP, "화이트", 2, "포멀", 4, 0, 2);
        Garment slacks = garment("블랙 슬랙스", Category.BOTTOM, "블랙", 3, "포멀", 4, 0, 5);
        DayContext work = DayContext.of(DAY, List.of(), weather(DAY, 16, 22), 0, Tpo.WORK);

        Outfit outfit = selector.select(work, List.of(tee, shirt, slacks), Set.of(), tee).orElseThrow();

        assertThat(outfit.in(OutfitSlot.TOP)).contains(tee);
        assertThat(outfit.in(OutfitSlot.BOTTOM)).contains(slacks);
    }

    @Test
    void workPrefersFormalOverCasual() {
        Garment tee = garment("그레이 티", Category.TOP, "그레이", 2, "캐주얼", 2, 0, 2);
        Garment shirt = garment("화이트 셔츠", Category.TOP, "화이트", 2, "포멀", 4, 0, 2);
        Garment jeans = garment("청바지", Category.BOTTOM, "블루", 3, "캐주얼", 2, 0, 8);
        Garment slacks = garment("블랙 슬랙스", Category.BOTTOM, "블랙", 3, "포멀", 4, 0, 5);
        DayContext work = DayContext.of(DAY, List.of(), weather(DAY, 16, 22), 0, Tpo.WORK);

        Outfit outfit = selector.select(work, List.of(tee, shirt, jeans, slacks), Set.of(), null).orElseThrow();

        assertThat(outfit.in(OutfitSlot.TOP)).contains(shirt);
        assertThat(outfit.in(OutfitSlot.BOTTOM)).contains(slacks);
    }

    @Test
    void clashingColorsLowerHarmony() {
        Garment red = garment("레드 티", Category.TOP, "레드", 2, "캐주얼", 2, 0, 2);
        Garment green = garment("그린 팬츠", Category.BOTTOM, "그린", 3, "캐주얼", 2, 0, 5);
        Garment black = garment("블랙 팬츠", Category.BOTTOM, "블랙", 3, "캐주얼", 2, 0, 5);

        assertThat(OutfitSelector.harmony(red, green)).isLessThan(OutfitSelector.harmony(red, black));
    }
}
