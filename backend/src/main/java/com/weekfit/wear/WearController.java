package com.weekfit.wear;

import com.weekfit.common.api.ApiResponse;
import com.weekfit.common.web.CurrentUserId;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "wear", description = "착용 기록과 체감 피드백")
@RestController
@RequestMapping("/api/wear-logs")
public class WearController {

    private final WearService service;

    public WearController(WearService service) {
        this.service = service;
    }

    @Operation(summary = "입은 옷 기록 (캐릭터에 입힌 조합 확정)")
    @PostMapping
    public ApiResponse<WearLogResponse> record(@Parameter(hidden = true) @CurrentUserId UUID userId,
            @Valid @RequestBody WearLogRequest request) {
        return ApiResponse.ok(service.record(userId, request));
    }

    @Operation(summary = "착용 기록 조회")
    @GetMapping
    public ApiResponse<List<WearLogResponse>> list(@Parameter(hidden = true) @CurrentUserId UUID userId,
            @RequestParam LocalDate from, @RequestParam LocalDate to) {
        return ApiResponse.ok(service.list(userId, from, to));
    }
}
