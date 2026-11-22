package com.modi.closet.similar;

import com.modi.ai.ClothingVisionAnalyzer;
import com.modi.closet.ClothingItem;
import com.modi.closet.ClothingRepository;
import com.modi.closet.ClothingResponse;
import com.modi.closet.ClothingSuggestion;
import com.modi.storage.ImageNormalizer;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 사려는 옷 사진을 분석해 옷장과 비교한다. 사진은 저장하지 않는다. */
@Service
public class SimilarCheckService {

    private static final int MAX_MATCHES = 3;

    private final ImageNormalizer imageNormalizer;
    private final ClothingVisionAnalyzer visionAnalyzer;
    private final ClothingRepository repository;
    private final Clock clock;

    public SimilarCheckService(ImageNormalizer imageNormalizer, ClothingVisionAnalyzer visionAnalyzer,
            ClothingRepository repository, Clock clock) {
        this.imageNormalizer = imageNormalizer;
        this.visionAnalyzer = visionAnalyzer;
        this.repository = repository;
        this.clock = clock;
    }

    /** @throws com.modi.ai.AiUnavailableException 사진 분석에 실패한 경우(503) */
    @Transactional(readOnly = true)
    public SimilarCheckResult check(UUID userId, byte[] upload) {
        byte[] jpeg = imageNormalizer.normalize(upload);
        ClothingSuggestion target = ClothingSuggestion.from(visionAnalyzer.analyze(jpeg));
        return compare(target, repository.findByUserIdOrderByCreatedAtDesc(userId), clock.instant());
    }

    /** 이미 분석한 옷 속성을 옷장과 비교한다. 살까 말까의 부위별 비교가 쓴다. */
    @Transactional(readOnly = true)
    public SimilarCheckResult compareWith(UUID userId, ClothingSuggestion target) {
        return compare(target, repository.findByUserIdOrderByCreatedAtDesc(userId), clock.instant());
    }

    static SimilarCheckResult compare(ClothingSuggestion target, List<ClothingItem> closet, Instant now) {
        List<SimilarCheckResult.Match> matches = closet.stream()
                .map(item -> {
                    SimilarityScorer.Score s = SimilarityScorer.score(target, item);
                    return new SimilarCheckResult.Match(ClothingResponse.of(item, now), s.similarity(), s.reasons());
                })
                .filter(m -> m.similarity() >= SimilarityScorer.MATCH_MIN)
                .sorted(Comparator.comparingDouble(SimilarCheckResult.Match::similarity).reversed())
                .limit(MAX_MATCHES)
                .toList();
        double top = matches.isEmpty() ? 0.0 : matches.getFirst().similarity();
        String verdict = SimilarityScorer.verdict(top);
        int pairable = (int) closet.stream().filter(item -> SimilarityScorer.pairable(target, item)).count();
        String best = matches.isEmpty() ? null : displayName(matches.getFirst().item());
        return new SimilarCheckResult(target, verdict, matches, pairable, comment(verdict, best, pairable, target));
    }

    static String comment(String verdict, String bestName, int pairable, ClothingSuggestion target) {
        if (target.category() == null) {
            return "옷을 알아보지 못했어요. 옷이 잘 보이는 사진으로 다시 시도해 주세요.";
        }
        String pairText = pairable > 0
                ? "내 옷 " + pairable + "벌과 함께 입을 수 있어요."
                : "지금 옷장에는 함께 입을 옷이 거의 없어요.";
        return switch (verdict) {
            case "DUPLICATE" -> "옷장에 거의 같은 옷(" + bestName + ")이 있어요. 그래도 사면 " + pairText;
            case "SIMILAR" -> "옷장에 비슷한 옷(" + bestName + ")이 있어요. 그래도 사면 " + pairText;
            default -> "옷장에 없는 새로운 옷이에요. 사면 " + pairText;
        };
    }

    private static String displayName(ClothingResponse item) {
        if (item.name() != null) {
            return item.name();
        }
        return item.subType() != null ? item.subType() : "옷";
    }
}
