package com.weekfit.outfit;

import com.weekfit.common.api.ApiResponse;
import com.weekfit.common.web.CurrentUserId;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "outfits", description = "옷 평가")
@RestController
public class OutfitController {

    private final OutfitEvaluationService service;

    public OutfitController(OutfitEvaluationService service) {
        this.service = service;
    }

    @Operation(summary = "옷 평가 (캐릭터에 입힌 조합)")
    @PostMapping("/api/outfits/evaluate")
    public ApiResponse<OutfitEvaluation> evaluate(@Parameter(hidden = true) @CurrentUserId UUID userId,
            @Valid @RequestBody EvaluateRequest request) {
        return ApiResponse.ok(service.evaluate(userId, request));
    }
}
