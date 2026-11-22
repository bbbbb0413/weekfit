package com.modi.common.cache;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class TtlCacheTest {

    private static final Instant T0 = Instant.parse("2026-11-22T00:00:00Z");

    @Test
    void returnsValueUntilTtlEnds() {
        TtlCache<String> cache = new TtlCache<>(Duration.ofHours(6), 10);
        cache.put("입력", "값", T0);

        assertThat(cache.get("입력", T0.plus(Duration.ofHours(5)))).isEqualTo("값");
        assertThat(cache.get("입력", T0.plus(Duration.ofHours(6)))).isNull();
        assertThat(cache.get("다른 입력", T0)).isNull();
    }

    @Test
    void fullCacheDropsExpiredEntriesFirst() {
        TtlCache<String> cache = new TtlCache<>(Duration.ofHours(1), 2);
        cache.put("a", "오래된 값", T0);
        cache.put("b", "새 값", T0.plus(Duration.ofMinutes(90)));
        cache.put("c", "더 새 값", T0.plus(Duration.ofMinutes(91)));

        Instant now = T0.plus(Duration.ofMinutes(92));
        assertThat(cache.get("a", now)).isNull();
        assertThat(cache.get("b", now)).isEqualTo("새 값");
        assertThat(cache.get("c", now)).isEqualTo("더 새 값");
    }

    @Test
    void fullCacheWithoutExpiredEntriesStartsOver() {
        TtlCache<String> cache = new TtlCache<>(Duration.ofHours(1), 2);
        cache.put("a", "1", T0);
        cache.put("b", "2", T0);
        cache.put("c", "3", T0);

        assertThat(cache.get("a", T0)).isNull();
        assertThat(cache.get("c", T0)).isEqualTo("3");
        assertThat(cache.size()).isEqualTo(1);
    }

    @Test
    void sha256IsStableHex() {
        assertThat(TtlCache.sha256("abc"))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}
