package com.modi.closet;

import com.modi.ai.AiUnavailableException;
import com.modi.ai.ClothingVisionAnalyzer;
import com.modi.common.error.NotFoundException;
import com.modi.demo.DemoClothingSample;
import com.modi.storage.ImageNormalizer;
import com.modi.storage.StorageService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClothingService {

    private final ClothingRepository repository;
    private final StorageService storage;
    private final ImageNormalizer imageNormalizer;
    private final ClothingVisionAnalyzer visionAnalyzer;
    private final Clock clock;

    public ClothingService(ClothingRepository repository, StorageService storage, ImageNormalizer imageNormalizer,
            ClothingVisionAnalyzer visionAnalyzer, Clock clock) {
        this.repository = repository;
        this.storage = storage;
        this.imageNormalizer = imageNormalizer;
        this.visionAnalyzer = visionAnalyzer;
        this.clock = clock;
    }

    /** 이미지를 저장하고 AI 제안을 붙여 돌려준다. AI 실패는 빈 제안으로 처리해 등록 흐름을 막지 않는다. */
    public ClothingAnalysisResult analyze(byte[] upload) {
        byte[] jpeg = imageNormalizer.normalize(upload);
        String key = storage.putJpeg(jpeg);
        if (DemoClothingSample.matches(upload)) {
            return new ClothingAnalysisResult(key, StorageService.urlOf(key), true, DemoClothingSample.SUGGESTION);
        }
        try {
            ClothingSuggestion suggestion = ClothingSuggestion.from(visionAnalyzer.analyze(jpeg));
            return new ClothingAnalysisResult(key, StorageService.urlOf(key), true, suggestion);
        } catch (AiUnavailableException e) {
            return new ClothingAnalysisResult(key, StorageService.urlOf(key), false, ClothingSuggestion.empty());
        }
    }

    @Transactional
    public ClothingResponse create(UUID userId, ClothingCreateRequest request) {
        String imageKey = request.imageKey();
        if (imageKey != null && !storage.exists(imageKey)) {
            throw new IllegalArgumentException("imageKey 에 해당하는 이미지가 없습니다. 먼저 /api/clothes/analyze 로 올려 주세요.");
        }
        Instant now = clock.instant();
        ClothingItem saved = repository.save(ClothingItem.create(userId, request.spec(), imageKey, now));
        return ClothingResponse.of(saved, now);
    }

    @Transactional(readOnly = true)
    public List<ClothingResponse> list(UUID userId, Category category, ItemStatus status) {
        Instant now = clock.instant();
        return repository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(item -> category == null || item.getCategory() == category)
                .filter(item -> status == null || item.effectiveStatus(now) == status)
                .map(item -> ClothingResponse.of(item, now))
                .toList();
    }

    @Transactional(readOnly = true)
    public ClothingResponse get(UUID userId, UUID id) {
        return ClothingResponse.of(find(userId, id), clock.instant());
    }

    @Transactional
    public ClothingResponse update(UUID userId, UUID id, ClothingSpec spec) {
        ClothingItem item = find(userId, id);
        Instant now = clock.instant();
        item.update(spec, now);
        return ClothingResponse.of(item, now);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        repository.delete(find(userId, id));
    }

    @Transactional
    public ClothingResponse changeStatus(UUID userId, UUID id, ItemStatus status) {
        ClothingItem item = find(userId, id);
        Instant now = clock.instant();
        item.changeStatus(status, now);
        return ClothingResponse.of(item, now);
    }

    @Transactional
    public List<ClothingResponse> startLaundry(UUID userId, LaundryRequest request) {
        List<ClothingItem> items = findAll(userId, request.itemIds());
        Instant now = clock.instant();
        for (ClothingItem item : items) {
            Duration dry = request.dryHours() != null
                    ? Duration.ofHours(request.dryHours())
                    : item.getCategory().defaultDryTime();
            item.startWash(now, dry);
        }
        return items.stream().map(item -> ClothingResponse.of(item, now)).toList();
    }

    /** 요청한 ID 가 모두 이 사용자의 옷이어야 한다. 하나라도 없으면 404. */
    @Transactional(readOnly = true)
    public List<ClothingItem> findAll(UUID userId, Collection<UUID> ids) {
        List<ClothingItem> items = repository.findByUserIdAndIdIn(userId, new HashSet<>(ids));
        if (items.size() != new HashSet<>(ids).size()) {
            throw new NotFoundException("옷을 찾을 수 없습니다.");
        }
        return items;
    }

    private ClothingItem find(UUID userId, UUID id) {
        return repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("옷을 찾을 수 없습니다."));
    }
}
