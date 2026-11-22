package com.modi.shopping;

/** 한 쇼핑몰의 검색 결과 링크. sortLabel 은 "낮은 가격순"처럼 화면에 보여 줄 정렬 이름이다. */
public record MallLink(ShoppingMall mall, String mallName, SortOrder sort, String sortLabel, String url) {
}
