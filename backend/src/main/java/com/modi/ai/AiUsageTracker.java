package com.modi.ai;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Component;

/**
 * 서버가 켜진 뒤 AI 호출 횟수와 토큰을 기능별로 센다. 메모리에만 두므로 재시작하면 0부터 다시 센다.
 * 금액은 Claude Console 사용량 화면에서 확인한다.
 */
@Component
public class AiUsageTracker {

    private static final int RECENT = 30;

    private final Instant since = Instant.now();
    private final Map<String, Counter> byFeature = new ConcurrentHashMap<>();
    private final Deque<Call> recent = new ArrayDeque<>();

    public void record(String feature, String model, long inputTokens, long outputTokens, long millis, boolean ok) {
        Counter c = byFeature.computeIfAbsent(feature, k -> new Counter());
        c.calls.incrementAndGet();
        if (!ok) {
            c.failures.incrementAndGet();
        }
        c.inputTokens.addAndGet(inputTokens);
        c.outputTokens.addAndGet(outputTokens);
        synchronized (recent) {
            recent.addFirst(new Call(Instant.now(), feature, model, inputTokens, outputTokens, millis, ok));
            while (recent.size() > RECENT) {
                recent.removeLast();
            }
        }
    }

    public Report report() {
        Map<String, Totals> features = new TreeMap<>();
        long calls = 0, input = 0, output = 0;
        for (Map.Entry<String, Counter> e : byFeature.entrySet()) {
            Counter c = e.getValue();
            Totals t = new Totals(c.calls.get(), c.failures.get(), c.inputTokens.get(), c.outputTokens.get());
            features.put(e.getKey(), t);
            calls += t.calls();
            input += t.inputTokens();
            output += t.outputTokens();
        }
        List<Call> last;
        synchronized (recent) {
            last = new ArrayList<>(recent);
        }
        return new Report(since, new Totals(calls, 0, input, output), features, last);
    }

    private static final class Counter {
        final AtomicLong calls = new AtomicLong();
        final AtomicLong failures = new AtomicLong();
        final AtomicLong inputTokens = new AtomicLong();
        final AtomicLong outputTokens = new AtomicLong();
    }

    public record Totals(long calls, long failures, long inputTokens, long outputTokens) {
    }

    public record Call(Instant at, String feature, String model, long inputTokens, long outputTokens, long millis, boolean ok) {
    }

    public record Report(Instant since, Totals total, Map<String, Totals> byFeature, List<Call> recent) {
    }
}
