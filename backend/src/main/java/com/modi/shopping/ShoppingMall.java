package com.modi.shopping;

import com.modi.closet.Category;
import java.util.Map;

/**
 * 검색 링크를 만들 쇼핑몰. URL 은 각 쇼핑몰 검색 화면에서 정렬을 눌렀을 때의 주소를 2026-11-21 에 확인한 것이다.
 * {q} 자리에 URL 인코딩한 검색어가 들어간다.
 * 11번가는 낮은 가격순 상위가 옵션가 미끼 상품과 비의류로 채워져(측정 상위 10개 중 28%) 랭킹순을 쓴다.
 * SSG 는 낮은 가격순 상위에 부자재가 많아 뺐다.
 * 무신사는 카테고리를 지정하지 않으면 낮은 가격순 상위에 다른 종류(패딩 검색에 반팔티, 스니커즈 검색에 양말)가 올라와 카테고리를 붙인다.
 */
public enum ShoppingMall {
    MUSINSA("무신사", SortOrder.PRICE_ASC, "https://www.musinsa.com/search/goods?keyword={q}&gf=A&sortCode=LOW_PRICE"),
    ZIGZAG("지그재그", SortOrder.PRICE_ASC, "https://zigzag.kr/search?keyword={q}&order=PRICE_ASC"),
    CM29("29CM", SortOrder.PRICE_ASC, "https://www.29cm.co.kr/store/search?keyword={q}&sort=LOWEST_PRICE&page=1"),
    WCONCEPT("W컨셉", SortOrder.PRICE_ASC, "https://display.wconcept.co.kr/search?keyword={q}&sort=LOWPRICE"),
    ELEVENST("11번가", SortOrder.POPULAR, "https://search.11st.co.kr/pc/total-search?kwd={q}&tabId=TOTAL_SEARCH&sortCd=NP&pageNo=1");

    private final String displayName;
    private final SortOrder sort;
    private final String template;

    ShoppingMall(String displayName, SortOrder sort, String template) {
        this.displayName = displayName;
        this.sort = sort;
        this.template = template;
    }

    public String displayName() {
        return displayName;
    }

    public SortOrder sort() {
        return sort;
    }

    private static final Map<Category, String> MUSINSA_CATEGORY = Map.of(
            Category.TOP, "001", Category.OUTER, "002", Category.BOTTOM, "003",
            Category.DRESS, "100", Category.SHOES, "103");

    String urlFor(String encodedQuery, Category category) {
        String url = template.replace("{q}", encodedQuery);
        if (this == MUSINSA && category != null && MUSINSA_CATEGORY.containsKey(category)) {
            url += "&category=" + MUSINSA_CATEGORY.get(category);
        }
        return url;
    }
}
