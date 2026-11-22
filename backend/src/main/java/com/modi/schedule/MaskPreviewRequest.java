package com.modi.schedule;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MaskPreviewRequest(@NotBlank @Size(max = 200) String title, @Size(max = 200) String location) {
}
