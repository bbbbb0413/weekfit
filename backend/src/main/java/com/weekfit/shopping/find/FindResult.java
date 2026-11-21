package com.weekfit.shopping.find;

import com.weekfit.shopping.MallLink;
import java.util.List;

/**
 * @param items         검증을 통과한 추천 제품 0~2개
 * @param fallbackLinks 쇼핑몰별 검색 링크. AI 가 실패하거나 제품을 못 찾아도 화면을 채울 수 있게 함께 준다
 * @param aiAvailable   false 면 Claude 호출이 실패했거나 웹 검색을 쓸 수 없는 설정이다
 * @param warnings      화면에 보여 줄 안내 문구
 */
public record FindResult(
        String analysis,
        String searchQuery,
        FindAiResult.Original original,
        List<Item> items,
        List<MallLink> fallbackLinks,
        boolean aiAvailable,
        List<String> warnings,
        long elapsedMs) {

    /**
     * @param imageUrl  상품 페이지의 og:image. 서버가 채우며 실패하면 null
     * @param cutoutUrl 배경을 제거한 이미지. 아직 지원하지 않아 항상 null
     */
    public record Item(String name, int price, String mall, String url, String reason, String size,
            FindCategory category, String imageUrl, String cutoutUrl) {
    }
}
