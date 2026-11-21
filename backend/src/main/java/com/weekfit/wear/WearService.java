package com.weekfit.wear;

import com.weekfit.closet.ClothingItem;
import com.weekfit.closet.ClothingService;
import com.weekfit.common.user.AppUser;
import com.weekfit.common.user.UserService;
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
