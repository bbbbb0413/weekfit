package com.weekfit.shopping.find;

import java.net.URI;
import java.util.List;
import java.util.Locale;

/** 웹 검색과 상품 링크를 허용하는 쇼핑몰 도메인. */
final class AllowedMalls {

    /**
     * 병렬 검색 묶음. 묶음마다 Claude 를 따로 호출하고 각 호출은 자기 묶음 도메인만 검색한다.
     * 패션 전문몰과 종합몰을 섞어 두 묶음의 결과 성격이 비슷하게 했다.
     */
    static final List<List<String>> GROUPS = List.of(
            List.of("musinsa.com", "29cm.co.kr", "ssg.com", "lotteon.com"),
            List.of("zigzag.kr", "wconcept.co.kr", "11st.co.kr", "coupang.com"));

    static final List<String> DOMAINS = GROUPS.stream().flatMap(List::stream).toList();

    private AllowedMalls() {
    }

    /** https 이고 호스트가 허용 도메인이거나 그 하위 도메인이면 true. */
    static boolean isAllowed(String url) {
        String host = hostOf(url);
        return host != null && DOMAINS.stream().anyMatch(d -> host.equals(d) || host.endsWith("." + d));
    }

    static String hostOf(String url) {
        if (url == null) {
            return null;
        }
        try {
            URI uri = URI.create(url.strip());
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
                return null;
            }
            return uri.getHost().toLowerCase(Locale.ROOT);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
