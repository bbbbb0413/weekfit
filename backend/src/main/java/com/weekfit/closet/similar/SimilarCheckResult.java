package com.weekfit.closet.similar;

import com.weekfit.closet.ClothingResponse;
import com.weekfit.closet.ClothingSuggestion;
import java.util.List;

public record SimilarCheckResult(
        ClothingSuggestion attributes,
        String verdict,
        List<Match> matches,
        int pairableCount,
        String comment) {

    public record Match(ClothingResponse item, double similarity, List<String> reasons) {
    }
}
