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
            "/api/outfits/evaluate",
            "/api/events/sync",
            "/api/events",
            "/api/plans/week",
            "/api/plans/day");
    private static final long WINDOW_MILLIS = 60 * 60 * 1000L;
    private static final String BODY = "{\"success\":false,\"data\":null,\"error\":\"요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.\"}";

    private final int limitPerHour;
    private final Clock clock;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public AiRateLimitFilter(@Value("${weekfit.rate-limit.ai-requests-per-hour:60}") int limitPerHour, Clock clock) {
        this.limitPerHour = limitPerHour;
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
        Window window = windows.compute(request.getRemoteAddr(), (ip, current) ->
                current == null || current.start() != windowStart ? new Window(windowStart, new AtomicInteger()) : current);
        if (window.count().incrementAndGet() > limitPerHour) {
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

    private record Window(long start, AtomicInteger count) {
    }
}
