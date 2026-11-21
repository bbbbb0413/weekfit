package com.weekfit.closet.similar;

import static org.assertj.core.api.Assertions.assertThat;

import com.weekfit.closet.Category;
import com.weekfit.closet.ClothingItem;
import com.weekfit.closet.ClothingSpec;
import com.weekfit.closet.ClothingSuggestion;
import com.weekfit.closet.ItemStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SimilarityScorerTest {

    private static final Instant NOW = Instant.parse("2026-11-21T09:00:00Z");
    private static final UUID USER = UUID.randomUUID();

    private static ClothingItem item(String name, Category c, String sub, List<String> colors, int warmth,
            List<String> styles, int formality) {
        return ClothingItem.create(USER, new ClothingSpec(name, c, sub, colors, warmth, styles, formality, null), null, NOW);
    }

    private static ClothingSuggestion target(Category c, String sub, List<String> colors, int warmth,
            List<String> styles, int formality) {
        return new ClothingSuggestion("업로드", c, sub, colors, warmth, styles, formality, null, 0.9, false, null);
    }

    private final ClothingSuggestion navyShirt = target(Category.TOP, "셔츠", List.of("네이비"), 2, List.of("포멀"), 4);

    @Test
    void identicalAttributesAreDuplicate() {
        ClothingItem same = item("네이비 셔츠", Category.TOP, "셔츠", List.of("네이비"), 2, List.of("포멀"), 4);

        SimilarityScorer.Score s = SimilarityScorer.score(navyShirt, same);

        assertThat(s.similarity()).isEqualTo(1.0);
        assertThat(SimilarityScorer.verdict(s.similarity())).isEqualTo("DUPLICATE");
        assertThat(s.reasons()).contains("같은 셔츠", "색 일치: 네이비", "스타일 일치: 포멀");
    }

    @Test
    void sameTypeDifferentColorIsSimilar() {
        ClothingItem white = item("화이트 셔츠", Category.TOP, "셔츠", List.of("화이트"), 2, List.of("포멀"), 4);

        double s = SimilarityScorer.score(navyShirt, white).similarity();

        assertThat(s).isEqualTo(0.65);
        assertThat(SimilarityScorer.verdict(s)).isEqualTo("SIMILAR");
    }

    @Test
    void differentCategoryScoresZero() {
        ClothingItem slacks = item("네이비 슬랙스", Category.BOTTOM, "슬랙스", List.of("네이비"), 2, List.of("포멀"), 4);

        assertThat(SimilarityScorer.score(navyShirt, slacks).similarity()).isZero();
    }

    @Test
    void unrelatedItemOfSameCategoryIsNew() {
        ClothingItem hoodie = item("레드 후드티", Category.TOP, "후드티", List.of("레드"), 4, List.of("스트릿"), 2);

        assertThat(SimilarityScorer.verdict(SimilarityScorer.score(navyShirt, hoodie).similarity())).isEqualTo("NEW");
    }

    @Test
    void pairableRequiresComplementaryCategoryAndCloseFormality() {
        ClothingItem slacks = item("블랙 슬랙스", Category.BOTTOM, "슬랙스", List.of("블랙"), 3, List.of("포멀"), 4);
        ClothingItem joggers = item("트레이닝 팬츠", Category.BOTTOM, "트레이닝팬츠", List.of("그레이"), 2, List.of("스포티"), 1);
        ClothingItem otherTop = item("화이트 셔츠", Category.TOP, "셔츠", List.of("화이트"), 2, List.of("포멀"), 4);
        ClothingItem coat = item("네이비 코트", Category.OUTER, "코트", List.of("네이비"), 5, List.of("포멀"), 4);

        assertThat(SimilarityScorer.pairable(navyShirt, slacks)).isTrue();
        assertThat(SimilarityScorer.pairable(navyShirt, coat)).isTrue();
        assertThat(SimilarityScorer.pairable(navyShirt, joggers)).isFalse();
        assertThat(SimilarityScorer.pairable(navyShirt, otherTop)).isFalse();
    }

    @Test
    void repairItemsAreNotPairable() {
        ClothingItem slacks = item("블랙 슬랙스", Category.BOTTOM, "슬랙스", List.of("블랙"), 3, List.of("포멀"), 4);
        slacks.changeStatus(ItemStatus.REPAIR, NOW);

        assertThat(SimilarityScorer.pairable(navyShirt, slacks)).isFalse();
    }

    @Test
    void unknownCategoryHasNoMatchesOrPairs() {
        ClothingSuggestion unknown = ClothingSuggestion.empty();
        ClothingItem slacks = item("블랙 슬랙스", Category.BOTTOM, "슬랙스", List.of("블랙"), 3, List.of("포멀"), 4);

        SimilarCheckResult r = SimilarCheckService.compare(unknown, List.of(slacks), NOW);

        assertThat(r.verdict()).isEqualTo("NEW");
        assertThat(r.matches()).isEmpty();
        assertThat(r.pairableCount()).isZero();
        assertThat(r.comment()).contains("다시 시도");
    }

    @Test
    void compareSortsMatchesAndBuildsComment() {
        ClothingItem same = item("네이비 셔츠", Category.TOP, "셔츠", List.of("네이비"), 2, List.of("포멀"), 4);
        ClothingItem white = item("화이트 셔츠", Category.TOP, "셔츠", List.of("화이트"), 2, List.of("포멀"), 4);
        ClothingItem hoodie = item("레드 후드티", Category.TOP, "후드티", List.of("레드"), 4, List.of("스트릿"), 2);
        ClothingItem slacks = item("블랙 슬랙스", Category.BOTTOM, "슬랙스", List.of("블랙"), 3, List.of("포멀"), 4);

        SimilarCheckResult r = SimilarCheckService.compare(navyShirt, List.of(hoodie, white, same, slacks), NOW);

        assertThat(r.verdict()).isEqualTo("DUPLICATE");
        assertThat(r.matches()).extracting(m -> m.item().name()).containsExactly("네이비 셔츠", "화이트 셔츠");
        assertThat(r.pairableCount()).isEqualTo(1);
        assertThat(r.comment()).contains("네이비 셔츠", "1벌");
    }
}
