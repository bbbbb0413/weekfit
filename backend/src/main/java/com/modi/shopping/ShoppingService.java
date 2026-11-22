package com.modi.shopping;

import com.modi.ai.ClothingAttributes;
import com.modi.ai.ClothingVisionAnalyzer;
import com.modi.closet.Category;
import com.modi.closet.ClothingSuggestion;
import com.modi.storage.ImageNormalizer;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ShoppingService {

    private final ImageNormalizer imageNormalizer;
    private final ClothingVisionAnalyzer visionAnalyzer;

    public ShoppingService(ImageNormalizer imageNormalizer, ClothingVisionAnalyzer visionAnalyzer) {
        this.imageNormalizer = imageNormalizer;
        this.visionAnalyzer = visionAnalyzer;
    }

    public ShoppingResult fromPhoto(byte[] upload) {
        byte[] jpeg = imageNormalizer.normalize(upload);
        ClothingAttributes raw = visionAnalyzer.analyze(jpeg);
        ClothingSuggestion attributes = ClothingSuggestion.from(raw);
        String query = ShoppingLinks.sanitize(query(raw, attributes));
        if (query.isEmpty()) {
            throw new IllegalArgumentException("사진에서 옷을 알아보지 못했습니다. 옷이 잘 보이는 사진으로 다시 시도해 주세요.");
        }
        return new ShoppingResult(attributes, query, ShoppingLinks.build(query, attributes.category()));
    }

    public ShoppingResult fromQuery(String rawQuery, Category category) {
        String query = ShoppingLinks.sanitize(rawQuery);
        if (query.isEmpty()) {
            throw new IllegalArgumentException("검색어를 입력해 주세요.");
        }
        return new ShoppingResult(null, query, ShoppingLinks.build(query, category));
    }

    /** AI 가 검색어를 주지 않으면 색과 세부 종류로 만든다. */
    static String query(ClothingAttributes raw, ClothingSuggestion attributes) {
        if (raw.searchQuery() != null && !raw.searchQuery().isBlank()) {
            return raw.searchQuery();
        }
        List<String> parts = new ArrayList<>();
        if (!attributes.colors().isEmpty()) {
            parts.add(attributes.colors().getFirst());
        }
        if (attributes.subType() != null) {
            parts.add(attributes.subType());
        } else if (attributes.name() != null) {
            parts.add(attributes.name());
        }
        return String.join(" ", parts);
    }
}
