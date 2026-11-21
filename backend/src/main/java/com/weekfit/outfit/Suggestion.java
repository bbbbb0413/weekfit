package com.weekfit.outfit;

import java.util.UUID;

/**
 * 교체 제안. replaceItemId 가 null 이면 withItemId 를 더하라는 뜻이고,
 * withItemId 가 null 이면 replaceItemId 를 빼라는 뜻이다.
 */
public record Suggestion(UUID replaceItemId, UUID withItemId, String reason) {
}
