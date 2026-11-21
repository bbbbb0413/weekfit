package com.weekfit.closet;

import jakarta.validation.constraints.NotNull;

public record StatusChangeRequest(@NotNull ItemStatus status) {
}
