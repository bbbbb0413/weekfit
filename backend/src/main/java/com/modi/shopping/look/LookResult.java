package com.modi.shopping.look;

import com.modi.closet.ClothingSuggestion;
import com.modi.closet.similar.SimilarCheckResult;
import java.util.List;

/**
 * 살까 말까: 사진 속 코디를 부위별 카드로 나눈 결과.
 *
 * @param pieces      겉옷, 상의, 하의, 신발 순서
 * @param aiAvailable false 면 AI 분석에 실패했다
 */
public record LookResult(List<Piece> pieces, boolean aiAvailable) {

    /**
     * @param productName 추정 제품명. 예: 울 혼방 싱글 브레스티드 롱코트
     * @param brandGuess  로고나 뚜렷한 특징으로 알아본 브랜드. 모르면 null
     * @param spec        한 줄 특징. 예: 무릎 아래 기장, 노치드 라펠, 단추 2개
     * @param box         사진에서 이 옷이 있는 영역(0~1 비율)
     * @param duplicate   옷장에 거의 같은 옷이 있을 때만 값이 있다
     */
    public record Piece(int index, String productName, String brandGuess, String spec, Box box,
            ClothingSuggestion attributes, String searchQuery, SimilarCheckResult.Match duplicate) {
    }

    public record Box(double x, double y, double w, double h) {
    }
}
