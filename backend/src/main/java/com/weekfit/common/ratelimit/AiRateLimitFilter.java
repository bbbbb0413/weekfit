package com.weekfit.common.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * AI 를 호출하는 요청(POST·PUT, 추천 GET)을 IP 당 시간당 횟수로 제한한다. 공개 URL 로 제출하므로 API 비용 폭주를 막는다.
 * 단일 서버 전제의 메모리 카운터이다.
 */
@Component
public class AiRateLimitFilter extends OncePerRequestFilter {

    private static final List<String> AI_PATHS = List.of(
            "/api/clothes/analyze",
            "/api/clothes/similar-check",
            "/api/shopping/similar",
            "/api/shopping/find",
            "/api/outfits/evaluate",
            "/api/events/sync",
            "/api/events",
            "/api/plans/week",
            "/api/plans/day");
    /** 웹 검색을 쓰는 제품 찾기는 1회 비용이 약 0.28달러라 별도 한도를 더 둔다. */
    static final String FIND_PATH = "/api/shopping/find";
    private static final long WINDOW_MILLIS = 60 * 60 * 1000L;
    private static final String BODY = "{\"success\":false,\"data\":null,\"error\":\"요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.\"}";

    private final int limitPerHour;
    private final int findLimitPerHour;
    private final Clock clock;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public AiRateLimitFilter(@Value("${weekfit.rate-limit.ai-requests-per-hour:60}") int limitPerHour,
            @Value("${weekfit.rate-limit.find-requests-per-hour:10}") int findLimitPerHour, Clock clock) {
        this.limitPerHour = limitPerHour;
        this.findLimitPerHour = findLimitPerHour;
        this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String method = request.getMethod();
        boolean limitedMethod = "POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method)
                || ("GET".equalsIgnoreCase(method) && request.getRequestURI().startsWith("/api/plans/"));
        return !limitedMethod || !AI_PATHS.contains(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long now = clock.millis();
        long windowStart = now - (now % WINDOW_MILLIS);
        String ip = request.getRemoteAddr();
        boolean overFind = FIND_PATH.equals(request.getRequestURI())
                && increment("find:" + ip, windowStart) > findLimitPerHour;
        if (overFind || increment(ip, windowStart) > limitPerHour) {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write(BODY);
            return;
        }
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(e -> e.getValue().start() != windowStart);
        }
        chain.doFilter(request, response);
    }

    private int increment(String key, long windowStart) {
        Window window = windows.compute(key, (k, current) ->
                current == null || current.start() != windowStart ? new Window(windowStart, new AtomicInteger()) : current);
        return window.count().incrementAndGet();
    }

    private record Window(long start, AtomicInteger count) {
    }
}
