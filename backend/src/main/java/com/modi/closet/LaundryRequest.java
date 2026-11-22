package com.modi.closet;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record LaundryRequest(
        @NotEmpty @Size(max = 50) List<UUID> itemIds,
        @Min(1) @Max(96) Integer dryHours) {
}
