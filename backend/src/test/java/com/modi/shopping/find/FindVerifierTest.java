package com.modi.shopping.find;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class FindVerifierTest {

    private static FindAiResult.AiItem item(String name, Integer price, String url) {
        return new FindAiResult.AiItem(name, price, "몰", url, "이유", "L", FindCategory.TOP);
    }

    private static FindAiResult ai(Integer originalPrice, FindAiResult.AiItem... items) {
        FindAiResult.Original original = originalPrice == null ? null : new FindAiResult.Original("원본", originalPrice);
        return new FindAiResult("분석", "네이비 니트 베스트", original, List.of(items));
    }

    @Test
    void keepsItemsWhoseUrlAppearedInSearchResultsIgnoringTrackingQuery() {
        FindAiResult result = ai(null, item("A", 20000, "https://www.musinsa.com/products/123?utm=x"));

        FindVerifier.Outcome out = FindVerifier.verify(result, Set.of("https://www.musinsa.com/products/123"));

        assertThat(out.items()).hasSize(1);
        assertThat(out.rejected()).isZero();
    }

    @Test
    void rejectsUrlNotInSearchResults() {
        FindAiResult result = ai(null, item("A", 20000, "https://www.musinsa.com/products/999"));

        FindVerifier.Outcome out = FindVerifier.verify(result, Set.of("https://www.musinsa.com/products/123"));

        assertThat(out.items()).isEmpty();
        assertThat(out.rejected()).isEqualTo(1);
    }

    @Test
    void rejectsDisallowedDomainHttpAndMissingPrice() {
        FindAiResult result = ai(null,
                item("A", 20000, "https://evil.example.com/products/1"),
                item("B", 20000, "http://www.musinsa.com/products/1"),
                item("C", null, "https://zigzag.kr/catalog/products/1"));

        assertThat(FindVerifier.verify(result, null).items()).isEmpty();
    }

    @Test
    void rejectsItemsNotCheaperThanOriginal() {
        FindAiResult result = ai(30000,
                item("비쌈", 30000, "https://zigzag.kr/catalog/products/1"),
                item("쌈", 29000, "https://www.29cm.co.kr/products/2"));

        assertThat(FindVerifier.verify(result, null).items()).extracting(FindAiResult.AiItem::name).containsExactly("쌈");
    }

    @Test
    void keepsOnlyOneItemPerMallAndAtMostTwo() {
        FindAiResult result = ai(null,
                item("A", 1000, "https://www.musinsa.com/products/1"),
                item("B", 1000, "https://m.musinsa.com/products/2"),
                item("C", 1000, "https://zigzag.kr/catalog/products/3"),
                item("D", 1000, "https://www.29cm.co.kr/products/4"));

        FindVerifier.Outcome out = FindVerifier.verify(result, null);

        assertThat(out.items()).extracting(FindAiResult.AiItem::name).containsExactly("A", "C");
        assertThat(out.rejected()).isEqualTo(2);
    }

    @Test
    void normalizeKeepsQueryWhenPathHasNoProductNumber() {
        assertThat(FindVerifier.normalize("https://www.ssg.com/item/itemView.ssg?itemId=1"))
                .isNotEqualTo(FindVerifier.normalize("https://www.ssg.com/item/itemView.ssg?itemId=2"));
    }

    @Test
    void handlesNullItemsList() {
        FindAiResult result = new FindAiResult("분석", "q", null, null);

        assertThat(FindVerifier.verify(result, Set.of()).items()).isEmpty();
    }

    @Test
    void mergeTakesTopItemOfEachCallFirst() {
        List<FindAiResult.AiItem> a = List.of(item("A1", 1000, "https://www.musinsa.com/products/1"),
                item("A2", 900, "https://www.29cm.co.kr/products/2"));
        List<FindAiResult.AiItem> b = List.of(item("B1", 1100, "https://zigzag.kr/catalog/products/3"));

        assertThat(FindVerifier.merge(List.of(a, b))).extracting(FindAiResult.AiItem::name).containsExactly("A1", "B1");
    }

    @Test
    void mergeSkipsDuplicateMallAcrossCalls() {
        List<FindAiResult.AiItem> a = List.of(item("A1", 1000, "https://www.musinsa.com/products/1"));
        List<FindAiResult.AiItem> b = List.of(item("B1", 900, "https://m.musinsa.com/products/9"),
                item("B2", 900, "https://zigzag.kr/catalog/products/3"));

        assertThat(FindVerifier.merge(List.of(a, b))).extracting(FindAiResult.AiItem::name).containsExactly("A1", "B2");
    }

    @Test
    void mergeOfEmptyCallsIsEmpty() {
        assertThat(FindVerifier.merge(List.of(List.of(), List.of()))).isEmpty();
    }

    @Test
    void groupsCoverEveryAllowedDomainWithoutOverlap() {
        assertThat(AllowedMalls.DOMAINS).doesNotHaveDuplicates().hasSize(8);
        assertThat(AllowedMalls.GROUPS).hasSize(2);
    }
}
