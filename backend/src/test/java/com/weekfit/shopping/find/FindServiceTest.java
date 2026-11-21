package com.weekfit.shopping.find;

import static org.assertj.core.api.Assertions.assertThat;

import com.weekfit.closet.Category;
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
}
