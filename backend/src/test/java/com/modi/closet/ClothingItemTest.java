package com.modi.closet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ClothingItemTest {

    private static final Instant NOW = Instant.parse("2026-11-21T09:00:00Z");

    private static ClothingItem shirt() {
        ClothingSpec spec = new ClothingSpec("네이비 셔츠", Category.TOP, "셔츠", List.of("네이비", "없는색"), 2,
                List.of("포멀"), 4, null);
        return ClothingItem.create(UUID.randomUUID(), spec, null, NOW);
    }

    @Test
    void usesCategoryDefaultWashThresholdAndDropsUnknownColors() {
        ClothingItem item = shirt();

        assertThat(item.getWashThreshold()).isEqualTo(Category.TOP.defaultWashThreshold());
        assertThat(item.getColors()).containsExactly("네이비");
    }

    @Test
    void needsWashAfterReachingThreshold() {
        ClothingItem item = shirt();
        item.recordWear(LocalDate.of(2026, 11, 20), NOW);
        assertThat(item.needsWash()).isFalse();

        item.recordWear(LocalDate.of(2026, 11, 21), NOW);
        assertThat(item.needsWash()).isTrue();
        assertThat(item.getLastWornOn()).isEqualTo(LocalDate.of(2026, 11, 21));
    }

    @Test
    void dryingBecomesAvailableAfterDryTime() {
        ClothingItem item = shirt();
        item.recordWear(LocalDate.of(2026, 11, 20), NOW);
        item.startWash(NOW, Duration.ofHours(24));

        assertThat(item.getWearsSinceWash()).isZero();
        assertThat(item.effectiveStatus(NOW.plus(Duration.ofHours(23)))).isEqualTo(ItemStatus.DRYING);
        assertThat(item.effectiveStatus(NOW.plus(Duration.ofHours(24)))).isEqualTo(ItemStatus.AVAILABLE);
    }

    @Test
    void rejectsManualDryingStatus() {
        assertThatThrownBy(() -> shirt().changeStatus(ItemStatus.DRYING, NOW))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsSpecWithoutKnownColor() {
        ClothingSpec spec = new ClothingSpec(null, Category.TOP, null, List.of("무지개"), 2, List.of(), 2, null);

        assertThatThrownBy(() -> ClothingItem.create(UUID.randomUUID(), spec, null, NOW))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
