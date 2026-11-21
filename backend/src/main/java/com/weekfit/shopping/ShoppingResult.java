package com.weekfit.shopping;

import com.weekfit.closet.ClothingSuggestion;
import java.util.List;

public record ShoppingResult(
        ClothingSuggestion attributes,
        String query,
        List<ShoppingProduct> products,
        int mallCount,
        Integer minPrice,
        Integer medianPrice) {
}
