package com.weekfit.plan;

import com.weekfit.closet.Category;

public enum OutfitSlot {
    TOP, BOTTOM, DRESS, OUTER, SHOES;

    public static OutfitSlot of(Category category) {
        return switch (category) {
            case TOP -> TOP;
            case BOTTOM -> BOTTOM;
            case DRESS -> DRESS;
            case OUTER -> OUTER;
            case SHOES, ACCESSORY -> SHOES;
        };
    }
}
