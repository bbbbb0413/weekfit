package com.modi.shopping.look;

import java.util.List;

/** AI가 코디 사진 한 장을 부위별로 나눈 결과. 좌표는 사진 크기에 대한 0~1 비율이다. */
record LookAiResult(List<Piece> pieces) {

    record Piece(
            String productName,
            String brandGuess,
            String spec,
            Double x,
            Double y,
            Double w,
            Double h,
            String name,
            String category,
            String subType,
            List<String> colors,
            Integer warmth,
            List<String> styles,
            Integer formality,
            Double confidence,
            String searchQuery) {
    }
}
