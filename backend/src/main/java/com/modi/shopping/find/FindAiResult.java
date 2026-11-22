package com.modi.shopping.find;

import java.util.List;

/** Claude 가 돌려주는 값. 서버가 채우는 필드(이미지 등)는 넣지 않는다. 넣으면 구조화 출력 스키마에 들어가 모델이 값을 지어낸다. */
public record FindAiResult(String analysis, String searchQuery, Original original, List<AiItem> items) {

    public record Original(String name, Integer price) {
    }

    public record AiItem(String name, Integer price, String mall, String url, String reason, String size,
            FindCategory category) {
    }
}
