package com.weekfit.shopping;

import com.weekfit.ai.ClothingAttributes;
import com.weekfit.ai.ClothingVisionAnalyzer;
import com.weekfit.closet.ClothingSuggestion;
import com.weekfit.storage.ImageNormalizer;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ShoppingService {

    private static final int MAX_QUERY = 50;

    private final ImageNormalizer imageNormalizer;
    private final ClothingVisionAnalyzer visionAnalyzer;
    private final NaverShoppingClient client;

    public ShoppingService(ImageNormalizer imageNormalizer, ClothingVisionAnalyzer visionAnalyzer,
            NaverShoppingClient client) {
        this.imageNormalizer = imageNormalizer;
        this.visionAnalyzer = visionAnalyzer;
        this.client = client;
    }

    public ShoppingResult findSimilar(byte[] upload, Integer maxPrice) {
        if (maxPrice != null && maxPrice < 1000) {
            throw new IllegalArgumentException("maxPrice 는 1000원 이상이어야 합니다.");
        }
        byte[] jpeg = imageNormalizer.normalize(upload);
        ClothingAttributes raw = visionAnalyzer.analyze(jpeg);
        ClothingSuggestion attributes = ClothingSuggestion.from(raw);
        String query = query(raw, attributes);
        if (query.isBlank()) {
            throw new IllegalArgumentException("사진에서 옷을 알아보지 못했습니다. 옷이 잘 보이는 사진으로 다시 시도해 주세요.");
        }
        List<ShoppingProduct> all = ShoppingRanking.toProducts(client.search(query), maxPrice);
        List<ShoppingProduct> products = ShoppingRanking.cheapestPerMall(all);
        Integer min = products.isEmpty() ? null : products.getFirst().price();
        return new ShoppingResult(attributes, query, products, products.size(), min, ShoppingRanking.median(products));
    }

    static String query(ClothingAttributes raw, ClothingSuggestion attributes) {
        String q = raw.searchQuery();
        if (q == null || q.isBlank()) {
            List<String> parts = new ArrayList<>();
            if (!attributes.colors().isEmpty()) {
                parts.add(attributes.colors().getFirst());
            }
            if (attributes.subType() != null) {
                parts.add(attributes.subType());
            } else if (attributes.name() != null) {
                parts.add(attributes.name());
            }
            q = String.join(" ", parts);
        }
        q = q.strip();
        return q.length() > MAX_QUERY ? q.substring(0, MAX_QUERY) : q;
    }
}
