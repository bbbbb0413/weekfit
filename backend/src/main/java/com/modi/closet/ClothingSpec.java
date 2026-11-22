package com.modi.closet;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** 사용자가 확정한 옷 속성. 생성·수정 요청에 공통으로 쓴다. */
public record ClothingSpec(
        @Size(max = 100) String name,
        @NotNull Category category,
        @Size(max = 50) String subType,
        @NotEmpty @Size(max = 3) List<String> colors,
        @NotNull @Min(1) @Max(5) Integer warmth,
        @NotNull @Size(max = 3) List<String> styles,
        @NotNull @Min(1) @Max(5) Integer formality,
        @Min(1) @Max(30) Integer washThreshold) {
}
