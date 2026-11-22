package com.modi.schedule;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public record EventInput(
        @Size(max = 200) String externalId,
        @NotBlank @Size(max = 200) String title,
        @NotNull OffsetDateTime startsAt,
        @NotNull OffsetDateTime endsAt,
        @Size(max = 200) String location) {
}
