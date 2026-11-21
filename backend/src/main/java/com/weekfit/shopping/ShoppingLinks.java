package com.weekfit.shopping;

import com.weekfit.closet.Category;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

/** 검색어 정리와 쇼핑몰별 링크 생성. 외부 호출이 없어 항상 결과를 만든다. */
final class ShoppingLinks {

    static final int MAX_QUERY = 50;
    private static final Pattern UNSAFE = Pattern.compile("[^\\p{L}\\p{N} \\-]");
    private static final Pattern SPACES = Pattern.compile("\\s+");

    private ShoppingLinks() {
    }

    /** 특수문자를 지우고 공백을 하나로 줄인 뒤 길이를 제한한다. 남는 글자가 없으면 빈 문자열이다. */
    static String sanitize(String raw) {
        if (raw == null) {
            return "";
        }
        String q = SPACES.matcher(UNSAFE.matcher(raw).replaceAll(" ")).replaceAll(" ").strip();
        return q.length() > MAX_QUERY ? q.substring(0, MAX_QUERY).strip() : q;
    }

    /** category 가 null 이면 카테고리 필터 없이 만든다. */
    static List<MallLink> build(String query, Category category) {
        String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8).replace("+", "%20");
        return Arrays.stream(ShoppingMall.values())
                .map(m -> new MallLink(m, m.displayName(), m.sort(), m.sort().label(), m.urlFor(encoded, category)))
                .toList();
    }
}
