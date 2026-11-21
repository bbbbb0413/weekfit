package com.weekfit.shopping;

import static org.assertj.core.api.Assertions.assertThat;

import com.weekfit.ai.ClothingAttributes;
import com.weekfit.closet.ClothingSuggestion;
import java.util.List;
import org.junit.jupiter.api.Test;

class ShoppingRankingTest {

    private static NaverShopResponse.Item item(String title, String price, String mall) {
        return new NaverShopResponse.Item(title, "https://shop/" + title, "https://img/" + title, price, mall, "");
    }

    @Test
    void stripsTagsAndEntities() {
        assertThat(ShoppingRanking.stripTags("<b>네이비</b> 니트 &amp; 가디건")).isEqualTo("네이비 니트 & 가디건");
    }

    @Test
    void skipsInvalidPricesAndAppliesMaxPrice() {
        List<ShoppingProduct> products = ShoppingRanking.toProducts(List.of(
                item("a", "30000", "무신사"), item("b", "", "29CM"), item("c", "0", "W컨셉"),
                item("d", "x", "지그재그"), item("e", "90000", "SSG")), 50000);

        assertThat(products).extracting(ShoppingProduct::title).containsExactly("a");
        assertThat(products.getFirst().brand()).isNull();
    }

    @Test
    void keepsCheapestPerMallSortedByPrice() {
        List<ShoppingProduct> products = ShoppingRanking.toProducts(List.of(
                item("a1", "30000", "무신사"), item("a2", "25000", "무신사"),
                item("b1", "40000", "29CM"), item("c1", "15000", "지그재그")), null);

        List<ShoppingProduct> ranked = ShoppingRanking.cheapestPerMall(products);

        assertThat(ranked).extracting(ShoppingProduct::title).containsExactly("c1", "a2", "b1");
    }

    @Test
    void limitsToTenMalls() {
        List<NaverShopResponse.Item> items = new java.util.ArrayList<>();
        for (int i = 0; i < 15; i++) {
            items.add(item("p" + i, String.valueOf(10000 + i), "mall" + i));
        }
        assertThat(ShoppingRanking.cheapestPerMall(ShoppingRanking.toProducts(items, null))).hasSize(10);
    }

    @Test
    void medianForOddAndEvenCounts() {
        List<ShoppingProduct> odd = ShoppingRanking.toProducts(List.of(
                item("a", "10000", "m1"), item("b", "30000", "m2"), item("c", "20000", "m3")), null);
        List<ShoppingProduct> even = ShoppingRanking.toProducts(List.of(
                item("a", "10000", "m1"), item("b", "20000", "m2")), null);

        assertThat(ShoppingRanking.median(odd)).isEqualTo(20000);
        assertThat(ShoppingRanking.median(even)).isEqualTo(15000);
        assertThat(ShoppingRanking.median(List.of())).isNull();
    }

    @Test
    void buildsQueryFromAttributesWhenAiQueryMissing() {
        ClothingAttributes raw = new ClothingAttributes("네이비 셔츠", "TOP", "셔츠", List.of("네이비"), 2, List.of(), 4,
                2, 0.9, null, null);

        assertThat(ShoppingService.query(raw, ClothingSuggestion.from(raw))).isEqualTo("네이비 셔츠");
    }

    @Test
    void prefersAiSearchQuery() {
        ClothingAttributes raw = new ClothingAttributes("x", "TOP", "니트", List.of("블랙"), 4, List.of(), 3,
                4, 0.9, null, " 블랙 오버핏 니트 ");

        assertThat(ShoppingService.query(raw, ClothingSuggestion.from(raw))).isEqualTo("블랙 오버핏 니트");
    }
}
