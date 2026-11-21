package com.weekfit.shopping;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/** 검색 결과 정리: 태그 제거, 가격 파싱, 상한 필터, 쇼핑몰별 최저가, 중앙값. */
final class ShoppingRanking {

    static final int MAX_PRODUCTS = 10;
    private static final Pattern TAG = Pattern.compile("<[^>]+>");

    private ShoppingRanking() {
    }

    static String stripTags(String s) {
        if (s == null) {
            return "";
        }
        return TAG.matcher(s).replaceAll("")
                .replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
                .replace("&quot;", "\"").replace("&#39;", "'").strip();
    }

    static Integer parsePrice(String lprice) {
        if (lprice == null || lprice.isBlank()) {
            return null;
        }
        try {
            int p = Integer.parseInt(lprice.strip());
            return p > 0 ? p : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    static List<ShoppingProduct> toProducts(List<NaverShopResponse.Item> items, Integer maxPrice) {
        List<ShoppingProduct> out = new ArrayList<>();
        for (NaverShopResponse.Item it : items) {
            Integer price = parsePrice(it.lprice());
            if (price == null || (maxPrice != null && price > maxPrice)) {
                continue;
            }
            String mall = it.mallName() == null || it.mallName().isBlank() ? "기타" : it.mallName().strip();
            String brand = it.brand() == null || it.brand().isBlank() ? null : it.brand().strip();
            out.add(new ShoppingProduct(stripTags(it.title()), price, mall, brand, it.link(), it.image()));
        }
        return out;
    }

    /** 쇼핑몰마다 최저가 1개만 남기고 가격 오름차순으로 최대 MAX_PRODUCTS 개. */
    static List<ShoppingProduct> cheapestPerMall(List<ShoppingProduct> products) {
        Map<String, ShoppingProduct> byMall = new LinkedHashMap<>();
        for (ShoppingProduct p : products) {
            byMall.merge(p.mallName(), p, (a, b) -> b.price() < a.price() ? b : a);
        }
        return byMall.values().stream()
                .sorted(Comparator.comparingInt(ShoppingProduct::price))
                .limit(MAX_PRODUCTS)
                .toList();
    }

    static Integer median(List<ShoppingProduct> products) {
        if (products.isEmpty()) {
            return null;
        }
        List<Integer> prices = products.stream().map(ShoppingProduct::price).sorted().toList();
        int n = prices.size();
        return n % 2 == 1 ? prices.get(n / 2) : (prices.get(n / 2 - 1) + prices.get(n / 2)) / 2;
    }
}
