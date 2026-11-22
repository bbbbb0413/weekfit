package com.modi.shopping.find;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class LenientFindConverterTest {

    private final LenientFindConverter converter = new LenientFindConverter();

    @Test
    void parsesJsonSurroundedByProse() {
        String text = "Original 제품을 찾았어요. 결과는 다음과 같아요.\n"
                + "{\"analysis\":\"네이비 {베스트}\",\"searchQuery\":\"네이비 베스트\",\"original\":null,"
                + "\"items\":[{\"name\":\"A\",\"price\":1000,\"mall\":\"무신사\",\"url\":\"https://www.musinsa.com/products/1\","
                + "\"reason\":\"r\",\"size\":\"L\",\"category\":\"VEST\"}]}\n이상입니다.";

        FindAiResult result = converter.convert(text);

        assertThat(result.analysis()).isEqualTo("네이비 {베스트}");
        assertThat(result.items()).singleElement().extracting(FindAiResult.AiItem::category).isEqualTo(FindCategory.VEST);
    }

    @Test
    void picksLastValidObjectWhenSeveralExist() {
        String text = "{\"note\":1} 그리고 {\"analysis\":\"최종\",\"searchQuery\":\"q\",\"original\":null,\"items\":[]}";

        assertThat(converter.convert(text).analysis()).isEqualTo("최종");
    }

    @Test
    void throwsWhenNoJsonAtAll() {
        assertThatThrownBy(() -> converter.convert("찾지 못했어요")).isInstanceOf(RuntimeException.class);
    }

    @Test
    void jsonObjectsIgnoresBracesInsideStrings() {
        assertThat(LenientFindConverter.jsonObjects("x {\"a\":\"}{\"} y {\"b\":2}")).containsExactly("{\"a\":\"}{\"}", "{\"b\":2}");
    }
}
