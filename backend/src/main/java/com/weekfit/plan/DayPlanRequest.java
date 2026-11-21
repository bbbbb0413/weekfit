package com.weekfit.plan;

import com.weekfit.schedule.Tpo;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record DayPlanRequest(@NotNull LocalDate date, UUID anchorItemId, Tpo tpo, Double lat, Double lon) {
}
