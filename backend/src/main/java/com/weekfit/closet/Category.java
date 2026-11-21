package com.weekfit.closet;

import java.time.Duration;

public enum Category {
    TOP(2, 24),
    BOTTOM(5, 24),
    OUTER(15, 48),
    DRESS(2, 24),
    SHOES(30, 24),
    ACCESSORY(30, 24);

    private final int defaultWashThreshold;
    private final int defaultDryHours;

    Category(int defaultWashThreshold, int defaultDryHours) {
        this.defaultWashThreshold = defaultWashThreshold;
        this.defaultDryHours = defaultDryHours;
    }

    public int defaultWashThreshold() {
        return defaultWashThreshold;
    }

    public Duration defaultDryTime() {
        return Duration.ofHours(defaultDryHours);
    }

    /** 대소문자·공백을 무시하고 해석한다. 알 수 없는 값이면 null. */
    public static Category parseOrNull(String value) {
        if (value == null) {
            return null;
        }
        try {
            return valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
