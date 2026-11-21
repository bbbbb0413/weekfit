package com.weekfit.shopping;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/** 네이버 쇼핑 검색 API 응답 중 사용하는 필드. */
@JsonIgnoreProperties(ignoreUnknown = true)
record NaverShopResponse(List<Item> items) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Item(String title, String link, String image, String lprice, String mallName, String brand) {
    }
}
