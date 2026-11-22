package com.modi.closet.similar;

import com.modi.closet.Category;
import com.modi.closet.ClothingItem;
import com.modi.closet.ClothingSuggestion;
import com.modi.closet.ItemStatus;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** 업로드한 옷과 옷장 속 옷의 속성 유사도, 함께 입을 수 있는 옷 판단. 순수 로직이다. */
public final class SimilarityScorer {

    public static final double DUPLICATE = 0.85;
    public static final double SIMILAR = 0.5;
    public static final double MATCH_MIN = 0.3;

    private static final double SUBTYPE_WEIGHT = 0.30;
    private static final double COLOR_WEIGHT = 0.35;
    private static final double STYLE_WEIGHT = 0.20;
    private static final double WARMTH_WEIGHT = 0.15;

    private static final Map<Category, Set<Category>> PAIRS = Map.of(
            Category.TOP, Set.of(Category.BOTTOM, Category.OUTER, Category.SHOES),
            Category.BOTTOM, Set.of(Category.TOP, Category.OUTER, Category.SHOES),
            Category.DRESS, Set.of(Category.OUTER, Category.SHOES),
            Category.OUTER, Set.of(Category.TOP, Category.BOTTOM, Category.DRESS),
            Category.SHOES, Set.of(Category.TOP, Category.BOTTOM, Category.DRESS),
            Category.ACCESSORY, Set.of());

    public record Score(double similarity, List<String> reasons) {
    }

    private SimilarityScorer() {
    }

    public static Score score(ClothingSuggestion target, ClothingItem item) {
        if (target.category() == null || target.category() != item.getCategory()) {
            return new Score(0.0, List.of());
        }
        double s = 0.0;
        List<String> reasons = new ArrayList<>();
        if (target.subType() != null && target.subType().equals(item.getSubType())) {
            s += SUBTYPE_WEIGHT;
            reasons.add("같은 " + item.getSubType());
        }
        List<String> sharedColors = intersect(target.colors(), item.getColors());
        s += COLOR_WEIGHT * jaccard(target.colors(), item.getColors());
        if (!sharedColors.isEmpty()) {
            reasons.add("색 일치: " + String.join(", ", sharedColors));
        }
        List<String> sharedStyles = intersect(target.styles(), item.getStyles());
        s += STYLE_WEIGHT * jaccard(target.styles(), item.getStyles());
        if (!sharedStyles.isEmpty()) {
            reasons.add("스타일 일치: " + String.join(", ", sharedStyles));
        }
        if (target.warmth() != null && Math.abs(target.warmth() - item.getWarmth()) <= 1) {
            s += WARMTH_WEIGHT;
            reasons.add("비슷한 두께");
        }
        return new Score(Math.round(Math.min(1.0, s) * 100) / 100.0, List.copyOf(reasons));
    }

    public static String verdict(double topSimilarity) {
        if (topSimilarity >= DUPLICATE) {
            return "DUPLICATE";
        }
        return topSimilarity >= SIMILAR ? "SIMILAR" : "NEW";
    }

    /** 보완 카테고리이면서 격식 차가 1 이하이고 수선 중이 아닌 옷이면 함께 입을 수 있다. */
    public static boolean pairable(ClothingSuggestion target, ClothingItem item) {
        if (target.category() == null || item.getStatus() == ItemStatus.REPAIR) {
            return false;
        }
        if (!PAIRS.getOrDefault(target.category(), Set.of()).contains(item.getCategory())) {
            return false;
        }
        return target.formality() == null || Math.abs(target.formality() - item.getFormality()) <= 1;
    }

    static double jaccard(List<String> a, List<String> b) {
        Set<String> union = new HashSet<>(a);
        union.addAll(b);
        if (union.isEmpty()) {
            return 0.0;
        }
        return (double) intersect(a, b).size() / union.size();
    }

    private static List<String> intersect(List<String> a, List<String> b) {
        return a.stream().filter(b::contains).distinct().toList();
    }
}
