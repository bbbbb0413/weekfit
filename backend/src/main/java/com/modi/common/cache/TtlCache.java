package com.modi.common.cache;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 시간이 지나면 만료되는 메모리 캐시. AI 응답처럼 같은 입력이면 같은 결과를 쓰는 곳에 둔다.
 * 키는 입력 문자열의 SHA-256 이라 긴 프롬프트도 그대로 넣을 수 있다. 서버를 재시작하면 비워진다.
 */
public final class TtlCache<V> {

    private record Entry<V>(Instant at, V value) {
    }

    private final Duration ttl;
    private final int maxSize;
    private final Map<String, Entry<V>> entries = new ConcurrentHashMap<>();

    public TtlCache(Duration ttl, int maxSize) {
        this.ttl = ttl;
        this.maxSize = maxSize;
    }

    /** 만료 전이면 값을, 없거나 만료됐으면 null 을 돌려준다. */
    public V get(String input, Instant now) {
        Entry<V> entry = entries.get(sha256(input));
        return entry != null && now.isBefore(entry.at().plus(ttl)) ? entry.value() : null;
    }

    /** 가득 차면 만료된 항목부터 지우고, 그래도 가득 차 있으면 전부 비운 뒤 넣는다. */
    public void put(String input, V value, Instant now) {
        if (entries.size() >= maxSize) {
            entries.entrySet().removeIf(e -> !now.isBefore(e.getValue().at().plus(ttl)));
            if (entries.size() >= maxSize) {
                entries.clear();
            }
        }
        entries.put(sha256(input), new Entry<>(now, value));
    }

    public int size() {
        return entries.size();
    }

    public static String sha256(String text) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
