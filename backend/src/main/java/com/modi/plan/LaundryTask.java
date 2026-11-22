package com.modi.plan;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** forDate 에 입으려면 deadline 까지 세탁을 시작해야 하는 옷들. */
public record LaundryTask(List<UUID> itemIds, List<String> itemNames, OffsetDateTime deadline, LocalDate forDate,
        String reason) {

    public LaundryTask {
        itemIds = List.copyOf(itemIds);
        itemNames = List.copyOf(itemNames);
    }
}
