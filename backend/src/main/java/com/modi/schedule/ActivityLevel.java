package com.modi.schedule;

public enum ActivityLevel {
    LOW, MEDIUM, HIGH;

    public static ActivityLevel parseOr(String value, ActivityLevel fallback) {
        if (value == null) {
            return fallback;
        }
        try {
            return valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return fallback;
        }
    }
}
