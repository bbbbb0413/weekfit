package com.modi.shopping.find;

import com.modi.closet.Category;
import com.modi.schedule.PiiMasker;
import com.modi.shopping.MallLink;
import com.modi.shopping.ShoppingService;
import com.modi.storage.ImageNormalizer;
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
    /** 상품을 못 찾으면 검색어를 바꿔 다시 찾는다. 처음 1번을 포함한 전체 시도 횟수 */
    static final int MAX_ATTEMPTS = 5;
    /** 이 시간이 지나면 새 재시도를 시작하지 않는다. 재시도 1번이 약 30초라 전체 대기를 1분 안팎으로 묶는다 */
    static final long RETRY_BUDGET_MILLIS = 40_000;
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
        // 못 찾은 결과는 캐시하지 않는다. 웹 검색은 같은 검색어도 성공과 실패가 갈려, 실패를 30분 붙잡아 두면 예시 버튼이 계속 실패로 보인다
        if (result.aiAvailable() && !result.items().isEmpty()) {
            if (cache.size() >= MAX_CACHE) {
                cache.entrySet().removeIf(e -> now - e.getValue().at() >= CACHE_MILLIS);
            }
            cache.put(key, new Cached(now, result));
        }
        return result;
    }

    private FindResult compute(byte[] jpeg, String text, long startedAt) {
        if (!finder.isEnabled()) {
            return aiDown(text, startedAt);
        }
        List<String> tried = new ArrayList<>();
        List<ProductFinder.Found> firstFounds = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            if (attempt > 1 && clock.millis() - startedAt > RETRY_BUDGET_MILLIS) {
                break;
            }
            List<ProductFinder.Found> founds = searchInParallel(jpeg, retryText(text, tried));
            if (founds.isEmpty()) {
                break;
            }
            if (firstFounds == null) {
                firstFounds = founds;
            }
            List<List<FindAiResult.AiItem>> perCall = new ArrayList<>();
            int rejected = 0;
            for (ProductFinder.Found found : founds) {
                FindVerifier.Outcome outcome = FindVerifier.verify(found.result(), found.searchedUrls());
                perCall.add(outcome.items());
                rejected += outcome.rejected();
            }
            List<FindAiResult.AiItem> merged = FindVerifier.merge(perCall);
            log.info("Product find attempt={} calls={} kept={} rejected={}", attempt, founds.size(), merged.size(),
                    rejected);
            if (!merged.isEmpty()) {
                return toResult(founds, withImages(merged), text, startedAt);
            }
            founds.stream().map(f -> f.result().searchQuery())
                    .filter(q -> q != null && !q.isBlank() && !tried.contains(q)).forEach(tried::add);
        }
        return firstFounds == null ? aiDown(text, startedAt) : toResult(firstFounds, List.of(), text, startedAt);
    }

    private FindResult aiDown(String text, long startedAt) {
        return new FindResult(null, null, null, List.of(), fallback(text, null, null), false,
                List.of(WARN_AI_DOWN), clock.millis() - startedAt);
    }

    private FindResult toResult(List<ProductFinder.Found> founds, List<FindResult.Item> items, String text,
            long startedAt) {
        FindAiResult first = founds.getFirst().result();
        String searchQuery = founds.stream().map(f -> f.result().searchQuery())
                .filter(q -> q != null && !q.isBlank()).findFirst().orElse(null);
        FindAiResult.Original original = founds.stream().map(f -> f.result().original())
                .filter(o -> o != null && o.price() != null).findFirst().orElse(null);
        List<String> warnings = List.of(items.isEmpty() ? WARN_NOT_FOUND : WARN_PRICE);
        Category category = items.isEmpty() ? null : toCategory(items.getFirst().category());
        return new FindResult(first.analysis(), searchQuery, original, items,
                fallback(text, searchQuery, category), true, warnings, clock.millis() - startedAt);
    }

    /** 재시도 때는 앞서 실패한 검색어를 알려 주고, 옷 종류와 색은 두고 세부 조건을 빼서 넓게 찾게 한다. */
    static String retryText(String text, List<String> tried) {
        if (tried.isEmpty()) {
            return text;
        }
        String base = text == null || text.isBlank() ? "이 사진 속 옷과 비슷하고 더 싼 제품을 찾아줘" : text;
        return base + "\n\n앞선 검색어(" + String.join(", ", tried) + ")로는 조건에 맞는 제품을 찾지 못했다. "
                + "이번에는 이 검색어들과 다른 검색어를 써라. 옷 종류와 색은 유지하고, 핏, 소재, 디테일 같은 세부 조건을 빼서 더 넓게 검색한다.";
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
