package com.modi.plan;

import com.modi.schedule.Tpo;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record DayPlanRequest(@NotNull LocalDate date, UUID anchorItemId, Tpo tpo, Double lat, Double lon) {
}
