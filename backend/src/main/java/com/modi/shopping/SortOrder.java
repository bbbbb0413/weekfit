package com.modi.shopping;

/** 쇼핑몰 링크가 여는 검색 결과의 정렬. label 은 화면에 그대로 보여 줄 문구다. */
public enum SortOrder {
    PRICE_ASC("낮은 가격순"),
    POPULAR("인기순");

    private final String label;

    SortOrder(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
