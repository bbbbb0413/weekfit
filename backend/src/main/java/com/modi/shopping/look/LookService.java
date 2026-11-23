package com.modi.shopping.look;

import com.modi.ai.ClothingAttributes;
import com.modi.closet.Category;
import com.modi.closet.ClothingSuggestion;
import com.modi.closet.similar.SimilarCheckResult;
import com.modi.closet.similar.SimilarCheckService;
import com.modi.storage.ImageNormalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;

/**
 * 코디 사진 한 장을 AI 한 번 호출로 부위별 카드(제품명, 속성, 위치)로 나누고,
 * 부위마다 기존 보유 검사 규칙으로 옷장과 비교한다. 비교는 AI를 다시 부르지 않는다.
 */
@Service
public class LookService {

    private static final Logger log = LoggerFactory.getLogger(LookService.class);
    private static final int MAX_PIECES = 4;
    // 겉옷, 상의(또는 원피스), 하의, 신발만 카드로 만든다. 소품은 버린다
    private static final List<Category> ORDER = List.of(Category.OUTER, Category.TOP, Category.DRESS, Category.BOTTOM,
            Category.SHOES);

    private final ChatClient chatClient;
    private final Resource systemPrompt;
    private final ImageNormalizer imageNormalizer;
    private final SimilarCheckService similarCheck;

    public LookService(ChatClient chatClient, @Value("classpath:prompts/look-analysis.st") Resource systemPrompt,
            ImageNormalizer imageNormalizer, SimilarCheckService similarCheck) {
        this.chatClient = chatClient;
        this.systemPrompt = systemPrompt;
        this.imageNormalizer = imageNormalizer;
        this.similarCheck = similarCheck;
    }

    public LookResult analyze(UUID userId, byte[] upload) {
        byte[] jpeg = imageNormalizer.normalize(upload);
        LookAiResult ai;
        try {
            ai = chatClient.prompt()
                    .system(systemPrompt)
                    .user(u -> u.text("이 사진 속 옷을 부위별로 나눠 주세요.").media(MimeTypeUtils.IMAGE_JPEG, new ByteArrayResource(jpeg)))
                    .call()
                    .entity(LookAiResult.class);
        } catch (RuntimeException e) {
            log.warn("Look analysis failed: {}", e.toString());
            return new LookResult(List.of(), false);
        }
        if (ai == null || ai.pieces() == null) {
            return new LookResult(List.of(), false);
        }
        List<LookResult.Piece> pieces = new ArrayList<>();
        ai.pieces().stream()
                .map(p -> new Parsed(p, ClothingSuggestion.from(attributesOf(p))))
                .filter(parsed -> ORDER.contains(parsed.attrs().category()))
                .filter(distinctSlot())
                .sorted(Comparator.comparingInt(parsed -> ORDER.indexOf(parsed.attrs().category())))
                .limit(MAX_PIECES)
                .forEach(parsed -> {
                    LookAiResult.Piece p = parsed.ai();
                    ClothingSuggestion attrs = parsed.attrs();
                    pieces.add(new LookResult.Piece(pieces.size(), trim(p.productName(), attrs.name()), blankToNull(p.brandGuess()),
                            blankToNull(p.spec()), boxOf(p), attrs, trim(p.searchQuery(), attrs.name()), duplicateOf(userId, attrs)));
                });
        return new LookResult(pieces, true);
    }

    // 부위마다 한 장만 (먼저 나온 것)
    private static java.util.function.Predicate<Parsed> distinctSlot() {
        java.util.Set<Category> seen = new java.util.HashSet<>();
        return parsed -> seen.add(parsed.attrs().category());
    }

    private record Parsed(LookAiResult.Piece ai, ClothingSuggestion attrs) {
    }

    // 정말 비슷할 때(DUPLICATE)만 경고용으로 돌려준다
    private SimilarCheckResult.Match duplicateOf(UUID userId, ClothingSuggestion attrs) {
        SimilarCheckResult result = similarCheck.compareWith(userId, attrs);
        return "DUPLICATE".equals(result.verdict()) && !result.matches().isEmpty() ? result.matches().getFirst() : null;
    }

    private static ClothingAttributes attributesOf(LookAiResult.Piece p) {
        return new ClothingAttributes(p.name(), p.category(), p.subType(), p.colors(), p.warmth(), p.styles(), p.formality(),
                null, p.confidence(), p.spec(), p.searchQuery());
    }

    private static LookResult.Box boxOf(LookAiResult.Piece p) {
        double x = clamp(p.x()), y = clamp(p.y());
        double w = Math.max(0.05, Math.min(clamp(p.w()), 1 - x));
        double h = Math.max(0.05, Math.min(clamp(p.h()), 1 - y));
        return new LookResult.Box(x, y, w, h);
    }

    private static double clamp(Double v) {
        return v == null ? 0.0 : Math.max(0.0, Math.min(1.0, v));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String trim(String s, String fallback) {
        String v = blankToNull(s);
        if (v == null) {
            v = fallback;
        }
        return v == null ? null : v.length() > 80 ? v.substring(0, 80) : v;
    }
}
