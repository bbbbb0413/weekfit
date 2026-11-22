package com.modi.closet;

import com.modi.ai.ClothingAttributes;
import com.modi.ai.Vocabulary;
import java.util.List;

/** AI 추정값을 정해진 어휘·범위로 정리한 제안. 알 수 없는 값은 null 이다. */
public record ClothingSuggestion(
        String name,
        Category category,
        String subType,
        List<String> colors,
        Integer warmth,
        List<String> styles,
        Integer formality,
        Integer washThreshold,
        double confidence,
        boolean lowConfidence,
        String description) {

    static final double LOW_CONFIDENCE = 0.6;

    public static ClothingSuggestion empty() {
        return new ClothingSuggestion(null, null, null, List.of(), null, List.of(), null, null, 0.0, true, null);
    }

    public static ClothingSuggestion from(ClothingAttributes a) {
        Category category = Category.parseOrNull(a.category());
        double confidence = a.confidence() == null ? 0.0 : Math.max(0.0, Math.min(1.0, a.confidence()));
        List<String> colors = Vocabulary.colors(a.colors());
        boolean low = confidence < LOW_CONFIDENCE || category == null || colors.isEmpty();
        return new ClothingSuggestion(
                trim(a.name(), 100),
                category,
                trim(a.subType(), 50),
                colors,
                clamp(a.warmth(), 1, 5),
                Vocabulary.styles(a.styles()),
                clamp(a.formality(), 1, 5),
                clamp(a.washThreshold(), 1, 30),
                confidence,
                low,
                trim(a.description(), 300));
    }

    private static Integer clamp(Integer value, int min, int max) {
        return value == null ? null : Math.max(min, Math.min(max, value));
    }

    private static String trim(String value, int max) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String t = value.trim();
        return t.length() > max ? t.substring(0, max) : t;
    }
}
