package com.weekfit.demo;

import com.weekfit.closet.Category;
import com.weekfit.closet.ClothingItem;
import com.weekfit.closet.ClothingRepository;
import com.weekfit.closet.ClothingSpec;
import com.weekfit.closet.ItemStatus;
import com.weekfit.common.user.AppUser;
import com.weekfit.storage.StorageService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 데모 옷장. 자취 2년 차 신입사원을 가정했다.
 * seed/images 에 {slug}.jpg 를 넣어 두면 그 사진이 연결된다.
 */
@Component
public class DemoClosetSeed {

    private final ClothingRepository repository;
    private final StorageService storage;
    private final Clock clock;

    public DemoClosetSeed(ClothingRepository repository, StorageService storage, Clock clock) {
        this.repository = repository;
        this.storage = storage;
        this.clock = clock;
    }

    @Transactional
    public int seedIfEmpty() {
        UUID userId = AppUser.DEMO_USER_ID;
        if (repository.countByUserId(userId) > 0) {
            return 0;
        }
        Instant now = clock.instant();
        LocalDate today = LocalDate.now(clock);
        List<Seed> seeds = seeds();
        for (Seed seed : seeds) {
            ClothingItem item = ClothingItem.create(userId, seed.spec(), imageKey(seed.slug()), now);
            for (int i = 0; i < seed.wears(); i++) {
                item.recordWear(today.minusDays(seed.wears() - i), now);
            }
            if (seed.status() != ItemStatus.AVAILABLE) {
                item.changeStatus(seed.status(), now);
            }
            repository.save(item);
        }
        return seeds.size();
    }

    private String imageKey(String slug) {
        String key = slug + ".jpg";
        try {
            return storage.exists(key) ? key : null;
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static List<Seed> seeds() {
        return List.of(
                seed("white-oxford-shirt", "화이트 옥스포드 셔츠", Category.TOP, "셔츠", List.of("화이트"), 2, List.of("미니멀", "포멀"), 4, 0),
                seed("navy-shirt", "네이비 셔츠", Category.TOP, "셔츠", List.of("네이비"), 2, List.of("포멀"), 4, 2),
                seed("gray-sweatshirt", "그레이 맨투맨", Category.TOP, "맨투맨", List.of("그레이"), 3, List.of("캐주얼"), 2, 1, ItemStatus.LAUNDRY),
                seed("black-knit", "블랙 라운드 니트", Category.TOP, "니트", List.of("블랙"), 4, List.of("미니멀"), 3, 1),
                seed("beige-tshirt", "베이지 반팔 티셔츠", Category.TOP, "반팔티", List.of("베이지"), 1, List.of("캐주얼"), 2, 0),
                seed("stripe-longsleeve", "스트라이프 긴팔 티셔츠", Category.TOP, "긴팔티", List.of("화이트", "네이비"), 2, List.of("캐주얼"), 2, 0),
                seed("black-slacks", "블랙 슬랙스", Category.BOTTOM, "슬랙스", List.of("블랙"), 3, List.of("포멀", "미니멀"), 4, 2),
                seed("light-jeans", "연청 청바지", Category.BOTTOM, "청바지", List.of("블루"), 3, List.of("캐주얼"), 2, 3),
                seed("beige-chinos", "베이지 치노 팬츠", Category.BOTTOM, "치노", List.of("베이지"), 3, List.of("캐주얼", "미니멀"), 3, 1),
                seed("gray-joggers", "그레이 트레이닝 팬츠", Category.BOTTOM, "트레이닝팬츠", List.of("그레이"), 2, List.of("스포티"), 1, 0),
                seed("navy-wool-coat", "네이비 울 코트", Category.OUTER, "코트", List.of("네이비"), 5, List.of("포멀", "미니멀"), 4, 3),
                seed("khaki-windbreaker", "카키 바람막이", Category.OUTER, "바람막이", List.of("카키"), 2, List.of("아웃도어", "스포티"), 2, 0),
                seed("gray-cardigan", "그레이 가디건", Category.OUTER, "가디건", List.of("그레이"), 3, List.of("미니멀"), 3, 1),
                seed("black-padding", "블랙 숏패딩", Category.OUTER, "패딩", List.of("블랙"), 5, List.of("캐주얼"), 2, 2),
                seed("white-sneakers", "화이트 스니커즈", Category.SHOES, "운동화", List.of("화이트"), 2, List.of("캐주얼"), 2, 4),
                seed("black-derby", "블랙 더비 슈즈", Category.SHOES, "구두", List.of("블랙"), 2, List.of("포멀"), 5, 0),
                seed("trekking-shoes", "트레킹화", Category.SHOES, "등산화", List.of("그레이"), 3, List.of("아웃도어"), 1, 0));
    }

    private static Seed seed(String slug, String name, Category category, String subType, List<String> colors,
            int warmth, List<String> styles, int formality, int wears) {
        return seed(slug, name, category, subType, colors, warmth, styles, formality, wears, ItemStatus.AVAILABLE);
    }

    private static Seed seed(String slug, String name, Category category, String subType, List<String> colors,
            int warmth, List<String> styles, int formality, int wears, ItemStatus status) {
        return new Seed(slug, new ClothingSpec(name, category, subType, colors, warmth, styles, formality,
                washThreshold(subType)), wears, status);
    }

    /** 세부 종류별 일반적인 세탁 주기. 목록에 없으면 카테고리 기본값을 쓴다. */
    private static Integer washThreshold(String subType) {
        return switch (subType) {
            case "반팔티", "긴팔티" -> 1;
            case "셔츠" -> 2;
            case "맨투맨" -> 3;
            case "니트", "가디건" -> 4;
            case "슬랙스", "치노" -> 5;
            case "청바지" -> 8;
            case "트레이닝팬츠" -> 3;
            default -> null;
        };
    }

    private record Seed(String slug, ClothingSpec spec, int wears, ItemStatus status) {
    }
}
