package com.modi.closet;

import com.modi.storage.StorageService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ClothingResponse(
        UUID id,
        String name,
        String imageUrl,
        Category category,
        String subType,
        List<String> colors,
        int warmth,
        List<String> styles,
        int formality,
        ItemStatus status,
        boolean needsWash,
        int wearsSinceWash,
        int washThreshold,
        Instant dryUntil,
        LocalDate lastWornOn) {

    public static ClothingResponse of(ClothingItem item, Instant now) {
        ItemStatus effective = item.effectiveStatus(now);
        return new ClothingResponse(
                item.getId(),
                item.getName(),
                StorageService.urlOf(item.getImageKey()),
                item.getCategory(),
                item.getSubType(),
                item.getColors(),
                item.getWarmth(),
                item.getStyles(),
                item.getFormality(),
                effective,
                item.needsWash(),
                item.getWearsSinceWash(),
                item.getWashThreshold(),
                effective == ItemStatus.DRYING ? item.getDryUntil() : null,
                item.getLastWornOn());
    }
}
