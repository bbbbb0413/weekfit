package com.weekfit.plan;

import com.weekfit.common.api.ApiResponse;
import com.weekfit.common.web.CurrentUserId;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "plans", description = "캘린더 기반 코디 추천")
@RestController
@RequestMapping("/api/plans")
public class PlanController {

    private final PlanService service;

    public PlanController(PlanService service) {
        this.service = service;
    }

    @Operation(summary = "7일 코디 계획 + 세탁 역산")
    @GetMapping("/week")
    public ApiResponse<PlanResponses.WeekPlan> week(@Parameter(hidden = true) @CurrentUserId UUID userId,
            @RequestParam LocalDate start, @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon) {
        return ApiResponse.ok(service.week(userId, start, lat, lon));
    }

    @Operation(summary = "하루 추천 (꼭 입을 옷 1벌 고정 가능)")
    @PostMapping("/day")
    public ApiResponse<PlanResponses.DayPlan> day(@Parameter(hidden = true) @CurrentUserId UUID userId,
            @Valid @RequestBody DayPlanRequest request) {
        return ApiResponse.ok(service.day(userId, request));
    }
}
