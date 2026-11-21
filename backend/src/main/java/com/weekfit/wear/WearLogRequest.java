package com.weekfit.wear;

import com.weekfit.common.user.ThermalFeedback;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record WearLogRequest(
        @NotNull LocalDate date,
        @NotEmpty @Size(max = 10) List<UUID> itemIds,
        ThermalFeedback feedback) {
}
