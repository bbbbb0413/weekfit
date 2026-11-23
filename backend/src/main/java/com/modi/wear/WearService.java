package com.modi.wear;

import com.modi.closet.ClothingItem;
import com.modi.closet.ClothingService;
import com.modi.common.error.NotFoundException;
import com.modi.common.user.AppUser;
import com.modi.common.user.UserService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WearService {

    private static final int MAX_RANGE_DAYS = 92;

    private final WearLogRepository repository;
    private final ClothingService clothingService;
    private final UserService userService;
    private final Clock clock;

    public WearService(WearLogRepository repository, ClothingService clothingService, UserService userService, Clock clock) {
        this.repository = repository;
        this.clothingService = clothingService;
        this.userService = userService;
        this.clock = clock;
    }

    @Transactional
    public WearLogResponse record(UUID userId, WearLogRequest request) {
        Instant now = clock.instant();
        List<UUID> ids = request.itemIds().stream().distinct().toList();
        List<ClothingItem> items = clothingService.findAll(userId, ids);
        items.forEach(item -> item.recordWear(request.date(), now));

        AppUser user = userService.getOrCreate(userId);
        if (request.feedback() != null) {
            user.applyFeedback(request.feedback());
        }
        WearLog saved = repository.save(WearLog.of(userId, request.date(), ids, request.feedback(), now));
        return WearLogResponse.of(saved, user.getWarmthBias());
    }

    /** 착용 기록 취소. 옷의 착용 횟수와 마지막 착용일, 사용자 체감 보정을 기록 전으로 되돌린다. */
    @Transactional
    public void cancel(UUID userId, UUID logId) {
        WearLog log = repository.findByIdAndUserId(logId, userId)
                .orElseThrow(() -> new NotFoundException("착용 기록을 찾을 수 없습니다."));
        List<WearLog> others = repository.findByUserId(userId).stream()
                .filter(l -> !l.getId().equals(logId)).toList();
        Instant now = clock.instant();
        for (ClothingItem item : clothingService.findAll(userId, log.getItemIds())) {
            LocalDate previous = others.stream().filter(l -> l.getItemIds().contains(item.getId()))
                    .map(WearLog::getWornOn).max(LocalDate::compareTo).orElse(null);
            item.undoWear(previous, now);
        }
        if (log.getFeedback() != null) {
            userService.getOrCreate(userId).revertFeedback(log.getFeedback());
        }
        repository.delete(log);
    }

    @Transactional(readOnly = true)
    public List<WearLogResponse> list(UUID userId, LocalDate from, LocalDate to) {
        if (to.isBefore(from) || from.plusDays(MAX_RANGE_DAYS).isBefore(to)) {
            throw new IllegalArgumentException("조회 기간은 from <= to 이고 92일 이내여야 합니다.");
        }
        return repository.findByUserIdAndWornOnBetweenOrderByWornOnAsc(userId, from, to).stream()
                .map(log -> WearLogResponse.of(log, null))
                .toList();
    }
}
