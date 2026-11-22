package com.modi.schedule;

import java.util.List;

/** 일정 성격(Time·Place·Occasion). 기본 격식·선호 스타일·중요도를 함께 정의한다. */
public enum Tpo {
    DAILY(2, List.of("캐주얼", "미니멀"), 1),
    WORK(4, List.of("포멀", "미니멀"), 2),
    FORMAL(5, List.of("포멀", "미니멀"), 5),
    DATE(3, List.of("미니멀", "캐주얼", "페미닌"), 4),
    OUTDOOR(2, List.of("아웃도어", "스포티", "캐주얼"), 3),
    EXERCISE(1, List.of("스포티"), 2);

    private final int defaultFormality;
    private final List<String> preferredStyles;
    private final int defaultImportance;

    Tpo(int defaultFormality, List<String> preferredStyles, int defaultImportance) {
        this.defaultFormality = defaultFormality;
        this.preferredStyles = preferredStyles;
        this.defaultImportance = defaultImportance;
    }

    public int defaultFormality() {
        return defaultFormality;
    }

    public List<String> preferredStyles() {
        return preferredStyles;
    }

    public int defaultImportance() {
        return defaultImportance;
    }

    public static Tpo parseOrNull(String value) {
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
