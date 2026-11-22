package com.modi.schedule;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record EventSyncRequest(
        @NotNull LocalDate from,
        @NotNull LocalDate to,
        @NotNull @Size(max = 100) List<@Valid EventInput> events) {
}
