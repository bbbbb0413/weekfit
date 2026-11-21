package com.weekfit.plan;

import com.weekfit.closet.Category;
import com.weekfit.closet.ClothingItem;
import com.weekfit.closet.ItemStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** 추천 엔진이 보는 옷. DB 엔티티와 분리해 엔진을 순수 로직으로 테스트한다. */
public record Garment(
        UUID id,
        String name,
        Category category,
        List<String> colors,
        int warmth,
        List<String> styles,
        int formality,
        int washThreshold,
        int wearsSinceWash,
        ItemStatus status,
        Instant dryUntil) {

    public static Garment of(ClothingItem item) {
        return new Garment(item.getId(), item.getName(), item.getCategory(), item.getColors(), item.getWarmth(),
                item.getStyles(), item.getFormality(), item.getWashThreshold(), item.getWearsSinceWash(),
                item.getStatus(), item.getDryUntil());
    }

    /** 그 시각에 입을 수 있는가. 세탁 대기(LAUNDRY)는 세탁하면 입을 수 있으므로 후보에 포함한다. */
    public boolean wearableAt(Instant at) {
        return switch (status) {
            case AVAILABLE, LAUNDRY -> true;
            case DRYING -> dryUntil == null || !dryUntil.isAfter(at);
            case REPAIR -> false;
        };
    }

    /** 현재 상태 기준으로 입기 전에 세탁이 필요한가. */
    public boolean needsWashNow() {
        return status == ItemStatus.LAUNDRY || wearsSinceWash >= washThreshold;
    }

    public String displayName() {
        return name == null ? category.name() : name;
    }
}
