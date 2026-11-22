package com.modi.closet.similar;

import com.modi.closet.ClothingResponse;
import com.modi.closet.ClothingSuggestion;
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
