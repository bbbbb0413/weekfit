package com.modi.shopping.find;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Claude 가 준 제품을 그대로 믿지 않고 거른다.
 * url 은 허용 도메인이어야 하고, 웹 검색 결과 목록이 있으면 그 안에 있어야 한다.
 */
final class FindVerifier {

    static final int MAX_ITEMS = 2;

    record Outcome(List<FindAiResult.AiItem> items, int rejected) {
    }

    private FindVerifier() {
    }

    /**
     * @param searchedUrls 웹 검색 결과 URL 목록. null 이면 목록을 받지 못한 것으로 보고 도메인만 검사한다
     */
    static Outcome verify(FindAiResult ai, Set<String> searchedUrls) {
        List<FindAiResult.AiItem> kept = new ArrayList<>();
        Set<String> malls = new HashSet<>();
        Set<String> searched = searchedUrls == null ? null : normalizeAll(searchedUrls);
        Integer originalPrice = ai.original() == null ? null : ai.original().price();
        int rejected = 0;
        for (FindAiResult.AiItem item : ai.items() == null ? List.<FindAiResult.AiItem>of() : ai.items()) {
            if (item == null || !acceptable(item, searched, originalPrice) || !malls.add(mallKey(item))) {
                rejected++;
                continue;
            }
            if (kept.size() == MAX_ITEMS) {
                rejected++;
                continue;
            }
            kept.add(item);
        }
        return new Outcome(List.copyOf(kept), rejected);
    }

    /**
     * 병렬 호출 결과를 합친다. 각 호출의 1순위를 먼저 번갈아 담고 나머지를 이어 담는다.
     * 쇼핑몰이 겹치면 뒤의 것을 버리고 최대 MAX_ITEMS 개만 남긴다.
     */
    static List<FindAiResult.AiItem> merge(List<List<FindAiResult.AiItem>> perCall) {
        List<FindAiResult.AiItem> out = new ArrayList<>();
        Set<String> malls = new HashSet<>();
        int longest = perCall.stream().mapToInt(List::size).max().orElse(0);
        for (int rank = 0; rank < longest && out.size() < MAX_ITEMS; rank++) {
            for (List<FindAiResult.AiItem> items : perCall) {
                if (rank < items.size() && out.size() < MAX_ITEMS && malls.add(mallKey(items.get(rank)))) {
                    out.add(items.get(rank));
                }
            }
        }
        return List.copyOf(out);
    }

    private static boolean acceptable(FindAiResult.AiItem item, Set<String> searched, Integer originalPrice) {
        if (item.name() == null || item.name().isBlank() || item.price() == null || item.price() <= 0) {
            return false;
        }
        if (originalPrice != null && item.price() >= originalPrice) {
            return false;
        }
        if (!AllowedMalls.isAllowed(item.url())) {
            return false;
        }
        return searched == null || searched.contains(normalize(item.url()));
    }

    private static String mallKey(FindAiResult.AiItem item) {
        String host = AllowedMalls.hostOf(item.url());
        return AllowedMalls.DOMAINS.stream().filter(d -> host.equals(d) || host.endsWith("." + d))
                .findFirst().orElse(host);
    }

    private static Set<String> normalizeAll(Set<String> urls) {
        Set<String> out = new HashSet<>();
        for (String u : urls) {
            String n = normalize(u);
            if (n != null) {
                out.add(n);
            }
        }
        return out;
    }

    /**
     * 스킴·프래그먼트·끝 슬래시·www 를 무시하고 비교한다. 경로에 상품 번호가 있으면 쿼리도 무시한다(추적 파라미터 차이 허용).
     * SSG 의 itemView.ssg?itemId= 처럼 경로에 번호가 없으면 쿼리까지 비교한다.
     */
    static String normalize(String url) {
        if (url == null) {
            return null;
        }
        try {
            URI uri = URI.create(url.strip());
            if (uri.getHost() == null) {
                return null;
            }
            String host = uri.getHost().toLowerCase(Locale.ROOT).replaceFirst("^(www|m)\\.", "");
            String path = uri.getPath() == null ? "" : uri.getPath().replaceAll("/+$", "");
            boolean idInPath = path.chars().anyMatch(Character::isDigit);
            return idInPath || uri.getRawQuery() == null ? host + path : host + path + "?" + uri.getRawQuery();
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
