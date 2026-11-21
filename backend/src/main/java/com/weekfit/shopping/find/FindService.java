package com.weekfit.shopping.find;

import com.weekfit.closet.Category;
import com.weekfit.schedule.PiiMasker;
import com.weekfit.shopping.MallLink;
import com.weekfit.shopping.ShoppingService;
import com.weekfit.storage.ImageNormalizer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * 가성비 옷 찾기(실제 제품 추천). Claude 가 실패하거나 제품을 못 찾아도 쇼핑몰 검색 링크는 함께 돌려준다.
 * 같은 사진·텍스트 요청은 30분 동안 캐시해 반복 호출 비용을 막는다.
 */
@Service
public class FindService {

    static final int MAX_TEXT = 300;
    private static final long CACHE_MILLIS = 30 * 60 * 1000L;
    private static final int MAX_CACHE = 500;
    private static final Pattern URL = Pattern.compile("https://\\S+");
    private static final Logger log = LoggerFactory.getLogger(FindService.class);

    static final String WARN_PRICE = "가격은 검색 시점 기준이에요. 구매 전 상품 페이지에서 확인해 주세요.";
    static final String WARN_NOT_FOUND = "조건에 맞는 상품을 찾지 못했어요. 아래 쇼핑몰 링크에서 더 찾아보세요.";
    static final String WARN_AI_DOWN = "지금은 AI 상품 찾기를 쓸 수 없어요. 아래 쇼핑몰 링크에서 찾아보세요.";

    private final ImageNormalizer imageNormalizer;
    private final ProductFinder finder;
    private final OgImageFetcher ogImageFetcher;
    private final ShoppingService shoppingService;
    private final Clock clock;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();
    /** Claude 호출과 og:image 요청은 대부분 네트워크 대기라 가상 스레드를 쓴다. */
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    private record Cached(long at, FindResult result) {
    }

    public FindService(ImageNormalizer imageNormalizer, ProductFinder finder, OgImageFetcher ogImageFetcher,
            ShoppingService shoppingService, Clock clock) {
        this.imageNormalizer = imageNormalizer;
        this.finder = finder;
        this.ogImageFetcher = ogImageFetcher;
        this.shoppingService = shoppingService;
        this.clock = clock;
    }

    public FindResult find(byte[] upload, String rawText) {
        String text = rawText == null ? null : rawText.strip();
        if ((upload == null || upload.length == 0) && (text == null || text.isEmpty())) {
            throw new IllegalArgumentException("사진이나 텍스트 중 하나는 보내 주세요.");
        }
        if (text != null && text.length() > MAX_TEXT) {
            throw new IllegalArgumentException("텍스트는 " + MAX_TEXT + "자 이하로 보내 주세요.");
        }
        byte[] jpeg = upload == null || upload.length == 0 ? null : imageNormalizer.normalize(upload);
        String safeText = text == null || text.isEmpty() ? null : maskKeepingUrls(text);
        String key = cacheKey(jpeg, safeText);
        long now = clock.millis();
        Cached hit = cache.get(key);
        if (hit != null && now - hit.at() < CACHE_MILLIS) {
            return hit.result();
        }
        FindResult result = compute(jpeg, safeText, now);
        if (result.aiAvailable()) {
            if (cache.size() >= MAX_CACHE) {
                cache.entrySet().removeIf(e -> now - e.getValue().at() >= CACHE_MILLIS);
            }
            cache.put(key, new Cached(now, result));
        }
        return result;
    }

    private FindResult compute(byte[] jpeg, String text, long startedAt) {
        List<ProductFinder.Found> founds = finder.isEnabled() ? searchInParallel(jpeg, text) : List.of();
        if (founds.isEmpty()) {
            return new FindResult(null, null, null, List.of(), fallback(text, null, null), false,
                    List.of(WARN_AI_DOWN), clock.millis() - startedAt);
        }
        List<List<FindAiResult.AiItem>> perCall = new ArrayList<>();
        int rejected = 0;
        for (ProductFinder.Found found : founds) {
            FindVerifier.Outcome outcome = FindVerifier.verify(found.result(), found.searchedUrls());
            perCall.add(outcome.items());
            rejected += outcome.rejected();
        }
        List<FindAiResult.AiItem> merged = FindVerifier.merge(perCall);
        log.info("Product find calls={} kept={} rejected={}", founds.size(), merged.size(), rejected);
        FindAiResult first = founds.getFirst().result();
        String searchQuery = founds.stream().map(f -> f.result().searchQuery())
                .filter(q -> q != null && !q.isBlank()).findFirst().orElse(null);
        FindAiResult.Original original = founds.stream().map(f -> f.result().original())
                .filter(o -> o != null && o.price() != null).findFirst().orElse(null);
        List<FindResult.Item> items = withImages(merged);
        List<String> warnings = List.of(items.isEmpty() ? WARN_NOT_FOUND : WARN_PRICE);
        Category category = items.isEmpty() ? null : toCategory(items.getFirst().category());
        return new FindResult(first.analysis(), searchQuery, original, items,
                fallback(text, searchQuery, category), true, warnings, clock.millis() - startedAt);
    }

    /**
     * 쇼핑몰 묶음마다 Claude 를 동시에 호출한다. 전체 시간은 가장 느린 호출에 맞춰지지만,
     * 각 호출의 검색이 3회로 줄어 직렬 5회보다 짧다. 실패한 호출은 빼고 나머지로 답한다.
     */
    private List<ProductFinder.Found> searchInParallel(byte[] jpeg, String text) {
        List<CompletableFuture<ProductFinder.Found>> calls = AllowedMalls.GROUPS.stream()
                .map(domains -> CompletableFuture.supplyAsync(() -> finder.find(text, jpeg, domains), executor))
                .toList();
        List<ProductFinder.Found> out = new ArrayList<>();
        for (CompletableFuture<ProductFinder.Found> call : calls) {
            try {
                out.add(call.join());
            } catch (RuntimeException e) {
                log.warn("Product find call failed: {}", e.toString());
            }
        }
        return List.copyOf(out);
    }

    /** og:image 는 제품마다 병렬로 읽는다. 각 요청은 3초 타임아웃이라 전체 지연은 3초 안팎이다. */
    private List<FindResult.Item> withImages(List<FindAiResult.AiItem> items) {
        List<CompletableFuture<String>> images = items.stream()
                .map(i -> CompletableFuture.supplyAsync(() -> ogImageFetcher.fetch(i.url()), executor))
                .toList();
        List<FindResult.Item> out = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            FindAiResult.AiItem a = items.get(i);
            out.add(new FindResult.Item(a.name(), a.price(), a.mall(), a.url(), a.reason(), a.size(), a.category(),
                    images.get(i).join(), null));
        }
        return List.copyOf(out);
    }

    /** 검색어가 없으면(사진만 보냈고 AI 실패) 링크를 만들 수 없어 빈 목록이다. */
    private List<MallLink> fallback(String text, String searchQuery, Category category) {
        String query = searchQuery != null && !searchQuery.isBlank() ? searchQuery : textWithoutUrls(text);
        if (query == null || query.isBlank()) {
            return List.of();
        }
        try {
            return shoppingService.fromQuery(query, category).links();
        } catch (IllegalArgumentException e) {
            return List.of();
        }
    }

    static Category toCategory(FindCategory c) {
        if (c == null) {
            return null;
        }
        return switch (c) {
            case TOP, VEST -> Category.TOP;
            case BOTTOM -> Category.BOTTOM;
            case OUTER -> Category.OUTER;
            case SHOES -> Category.SHOES;
        };
    }

    /** 개인정보는 가리되, 상품 링크는 검색 힌트이므로 허용 쇼핑몰 주소만 살린다. */
    static String maskKeepingUrls(String text) {
        List<String> kept = new ArrayList<>();
        Matcher m = URL.matcher(text);
        while (m.find()) {
            if (AllowedMalls.isAllowed(m.group())) {
                kept.add(m.group());
            }
        }
        String masked = PiiMasker.mask(text).text();
        return kept.isEmpty() ? masked : masked + "\n참고 링크: " + String.join(" ", kept);
    }

    private static String textWithoutUrls(String text) {
        return text == null ? null : URL.matcher(text).replaceAll(" ").strip();
    }

    private static String cacheKey(byte[] jpeg, String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            if (jpeg != null) {
                digest.update(jpeg);
            }
            digest.update((byte) 0);
            if (text != null) {
                digest.update(text.getBytes(StandardCharsets.UTF_8));
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
