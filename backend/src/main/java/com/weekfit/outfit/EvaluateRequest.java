package com.weekfit.outfit;

import com.weekfit.schedule.Tpo;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record EvaluateRequest(
        @NotEmpty @Size(max = 10) List<UUID> itemIds,
        LocalDate date,
        UUID eventId,
        Tpo tpo,
        Double lat,
        Double lon) {
}
