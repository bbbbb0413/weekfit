package com.weekfit.closet;

import static org.assertj.core.api.Assertions.assertThat;

import com.weekfit.ai.ClothingAttributes;
import java.util.List;
import org.junit.jupiter.api.Test;

class ClothingSuggestionTest {

    @Test
    void normalizesAiOutput() {
        ClothingAttributes raw = new ClothingAttributes(" 블랙 니트 ", "top", "니트", List.of("블랙", "검정"), 9,
                List.of("미니멀", "럭셔리"), 0, 4, 0.92, "두꺼운 니트", "블랙 라운드 니트");

        ClothingSuggestion s = ClothingSuggestion.from(raw);

        assertThat(s.name()).isEqualTo("블랙 니트");
        assertThat(s.category()).isEqualTo(Category.TOP);
        assertThat(s.colors()).containsExactly("블랙");
        assertThat(s.styles()).containsExactly("미니멀");
        assertThat(s.warmth()).isEqualTo(5);
        assertThat(s.formality()).isEqualTo(1);
        assertThat(s.lowConfidence()).isFalse();
    }

    @Test
    void flagsLowConfidenceWhenCategoryUnknown() {
        ClothingAttributes raw = new ClothingAttributes(null, null, null, List.of(), null, null, null, null, 0.0, null, null);

        assertThat(ClothingSuggestion.from(raw).lowConfidence()).isTrue();
    }
}
