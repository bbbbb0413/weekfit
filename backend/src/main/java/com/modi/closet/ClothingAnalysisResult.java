package com.modi.closet;

public record ClothingAnalysisResult(String imageKey, String imageUrl, boolean aiAvailable, ClothingSuggestion suggestion) {
}
