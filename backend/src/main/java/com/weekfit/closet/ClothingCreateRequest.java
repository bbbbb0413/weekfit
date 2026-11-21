package com.weekfit.closet;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** 옷 저장 요청. imageKey 는 /api/clothes/analyze 응답 값이며, 사진 없이 등록하면 null 이다. */
public record ClothingCreateRequest(
        @Size(max = 200) String imageKey,
        @Size(max = 100) String name,
        @NotNull Category category,
        @Size(max = 50) String subType,
        @NotEmpty @Size(max = 3) List<String> colors,
        @NotNull @Min(1) @Max(5) Integer warmth,
        @NotNull @Size(max = 3) List<String> styles,
        @NotNull @Min(1) @Max(5) Integer formality,
        @Min(1) @Max(30) Integer washThreshold) {

    public ClothingSpec spec() {
        return new ClothingSpec(name, category, subType, colors, warmth, styles, formality, washThreshold);
    }
}
