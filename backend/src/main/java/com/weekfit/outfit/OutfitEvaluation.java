package com.weekfit.outfit;

import java.util.List;

public record OutfitEvaluation(
        int score,
        String grade,
        OutfitRules.Checks checks,
        String summary,
        List<Suggestion> suggestions,
        List<String> warnings,
        boolean aiAvailable) {
}
