package com.weekfit.ai;

import java.util.List;

/**
 * 옷 사진 분석 결과(LLM 원본 출력). 값은 신뢰하지 않고 사용하는 쪽에서 정규화한다.
 *
 * @param category    TOP, BOTTOM, OUTER, DRESS, SHOES, ACCESSORY 중 하나
 * @param searchQuery 쇼핑몰 검색용 한국어 검색어
 */
public record ClothingAttributes(
        String name,
        String category,
        String subType,
        List<String> colors,
        Integer warmth,
        List<String> styles,
        Integer formality,
        Integer washThreshold,
        Double confidence,
        String description,
        String searchQuery) {
}
