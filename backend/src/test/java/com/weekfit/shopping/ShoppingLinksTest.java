package com.weekfit.shopping;

import static org.assertj.core.api.Assertions.assertThat;

import com.weekfit.closet.Category;
import java.util.List;
import org.junit.jupiter.api.Test;

class ShoppingLinksTest {

    @Test
    void sanitizeRemovesSymbolsAndCollapsesSpaces() {
        assertThat(ShoppingLinks.sanitize("  네이비  울&코트<script> ")).isEqualTo("네이비 울 코트 script");
    }

    @Test
    void sanitizeReturnsEmptyForNullOrSymbolsOnly() {
        assertThat(ShoppingLinks.sanitize(null)).isEmpty();
        assertThat(ShoppingLinks.sanitize("!!!")).isEmpty();
    }

    @Test
    void sanitizeLimitsLength() {
        assertThat(ShoppingLinks.sanitize("가".repeat(80))).hasSize(ShoppingLinks.MAX_QUERY);
    }

    @Test
    void buildCreatesOneLinkPerMallWithEncodedQuery() {
        List<MallLink> links = ShoppingLinks.build("네이비 코트", null);

        assertThat(links).hasSize(ShoppingMall.values().length);
        assertThat(links).allSatisfy(l -> {
            assertThat(l.url()).startsWith("https://").contains("%EB%84%A4%EC%9D%B4%EB%B9%84%20%EC%BD%94%ED%8A%B8");
            assertThat(l.url()).doesNotContain("{q}").doesNotContain(" ");
        });
    }

    @Test
    void zigzagLinkSortsByPriceAscending() {
        MallLink zigzag = ShoppingLinks.build("코트", null).stream()
                .filter(l -> l.mall() == ShoppingMall.ZIGZAG).findFirst().orElseThrow();

        assertThat(zigzag.url()).endsWith("order=PRICE_ASC");
    }

    @Test
    void elevenstUsesPopularSortBecauseLowPriceIsFullOfBaitListings() {
        MallLink elevenst = ShoppingLinks.build("코트", null).stream()
                .filter(l -> l.mall() == ShoppingMall.ELEVENST).findFirst().orElseThrow();

        assertThat(elevenst.sort()).isEqualTo(SortOrder.POPULAR);
        assertThat(elevenst.sortLabel()).isEqualTo("인기순");
        assertThat(elevenst.url()).contains("sortCd=NP");
    }

    @Test
    void musinsaLinkAddsCategoryFilterWhenCategoryKnown() {
        MallLink musinsa = ShoppingLinks.build("블랙 숏패딩", Category.OUTER).stream()
                .filter(l -> l.mall() == ShoppingMall.MUSINSA).findFirst().orElseThrow();

        assertThat(musinsa.url()).endsWith("&category=002");
    }

    @Test
    void otherMallsIgnoreCategory() {
        assertThat(ShoppingLinks.build("블랙 숏패딩", Category.OUTER))
                .filteredOn(l -> l.mall() != ShoppingMall.MUSINSA)
                .allSatisfy(l -> assertThat(l.url()).doesNotContain("category="));
    }

    @Test
    void accessoryHasNoMusinsaCategory() {
        MallLink musinsa = ShoppingLinks.build("가방", Category.ACCESSORY).stream()
                .filter(l -> l.mall() == ShoppingMall.MUSINSA).findFirst().orElseThrow();

        assertThat(musinsa.url()).doesNotContain("category=");
    }
}
