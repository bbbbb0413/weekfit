package com.modi.plan;

import com.modi.closet.Category;

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
