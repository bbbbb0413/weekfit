package com.modi.shopping.find;

import static org.assertj.core.api.Assertions.assertThat;

import com.modi.closet.Category;
import org.junit.jupiter.api.Test;

class FindServiceTest {

    @Test
    void masksPersonalInfoButKeepsAllowedMallLinks() {
        String masked = FindService.maskKeepingUrls(
                "010-1234-5678 로 연락 주세요 https://www.musinsa.com/products/1 https://evil.example.com/x");

        assertThat(masked).doesNotContain("010-1234-5678").doesNotContain("evil.example.com")
                .contains("https://www.musinsa.com/products/1");
    }

    @Test
    void mapsFindCategoryToClosetCategory() {
        assertThat(FindService.toCategory(FindCategory.VEST)).isEqualTo(Category.TOP);
        assertThat(FindService.toCategory(FindCategory.OUTER)).isEqualTo(Category.OUTER);
        assertThat(FindService.toCategory(FindCategory.SHOES)).isEqualTo(Category.SHOES);
        assertThat(FindService.toCategory(null)).isNull();
    }

    @Test
    void retryTextKeepsRequestAndListsFailedQueries() {
        assertThat(FindService.retryText("블랙 와이드 슬랙스", java.util.List.of())).isEqualTo("블랙 와이드 슬랙스");
        String retry = FindService.retryText("블랙 와이드 슬랙스", java.util.List.of("블랙 와이드 핀턱 슬랙스"));
        assertThat(retry).startsWith("블랙 와이드 슬랙스").contains("블랙 와이드 핀턱 슬랙스");
        assertThat(FindService.retryText(null, java.util.List.of("q"))).contains("사진 속 옷");
    }
}
