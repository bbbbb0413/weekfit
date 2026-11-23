package com.modi.ai;

import com.modi.common.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AiUsageController {

    private final AiUsageTracker tracker;

    public AiUsageController(AiUsageTracker tracker) {
        this.tracker = tracker;
    }

    @Operation(summary = "AI 사용량", description = "서버가 켜진 뒤 기능별 AI 호출 횟수와 입력, 출력 토큰. 재시작하면 0부터")
    @GetMapping("/api/ai-usage")
    public ApiResponse<AiUsageTracker.Report> usage() {
        return ApiResponse.ok(tracker.report());
    }
}
