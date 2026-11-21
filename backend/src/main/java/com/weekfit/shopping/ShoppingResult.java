package com.weekfit.shopping;

import com.weekfit.closet.ClothingSuggestion;
import java.util.List;

/**
 * @param attributes 사진 분석 결과. 검색어만으로 요청했으면 null
 * @param query      링크에 쓴 검색어. 프론트가 수정해 다시 요청할 수 있게 보여 준다
 * @param links      쇼핑몰별 낮은 가격순 검색 링크
 */
public record ShoppingResult(ClothingSuggestion attributes, String query, List<MallLink> links) {
}
