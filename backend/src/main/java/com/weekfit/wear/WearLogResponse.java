package com.weekfit.wear;

import com.weekfit.common.user.ThermalFeedback;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record WearLogResponse(UUID id, LocalDate date, List<UUID> itemIds, ThermalFeedback feedback, Integer warmthBias) {

    static WearLogResponse of(WearLog log, Integer warmthBias) {
        return new WearLogResponse(log.getId(), log.getWornOn(), log.getItemIds(), log.getFeedback(), warmthBias);
    }
}
