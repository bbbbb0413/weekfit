package com.modi.shopping.look;

import com.modi.shopping.find.FindResult;
import com.modi.shopping.find.FindService;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * 살까 말까 카드 하나의 가성비 제품 찾기. AI가 빈손으로 오면 검색어를 바꿔 최대 3번까지 다시 찾는다.
 * 첫 시도에만 카드 사진을 함께 보내고, 이후는 더 짧은 검색어로만 찾는다. 결과가 나오면 바로 멈춘다.
 */
@Service
public class LookFindService {

    static final int MAX_TRIES = 3;
    private static final int MAX_TEXT = 300;
    private static final Logger log = LoggerFactory.getLogger(LookFindService.class);

    private final FindService findService;

    public LookFindService(FindService findService) {
        this.findService = findService;
    }

    public FindResult find(byte[] image, List<String> queries) {
        Set<String> tries = new LinkedHashSet<>();
        for (String q : queries == null ? List.<String>of() : queries) {
            if (q != null && !q.isBlank()) {
                String t = q.strip();
                tries.add(t.length() > MAX_TEXT ? t.substring(0, MAX_TEXT) : t);
            }
            if (tries.size() == MAX_TRIES) {
                break;
            }
        }
        if (tries.isEmpty()) {
            throw new IllegalArgumentException("검색어를 하나 이상 보내 주세요.");
        }
        FindResult last = null;
        int attempt = 0;
        for (String query : tries) {
            last = findService.find(attempt == 0 ? image : null, query);
            attempt++;
            if (!last.items().isEmpty() || !last.aiAvailable()) {
                break;
            }
        }
        log.info("Look find tries={} found={}", attempt, last.items().size());
        return last;
    }
}
