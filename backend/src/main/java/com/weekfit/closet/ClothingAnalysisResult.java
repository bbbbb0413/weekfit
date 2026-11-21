package com.weekfit.closet;

public record ClothingAnalysisResult(String imageKey, String imageUrl, boolean aiAvailable, ClothingSuggestion suggestion) {
}
