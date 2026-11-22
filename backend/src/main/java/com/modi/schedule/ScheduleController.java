package com.modi.schedule;

import com.modi.common.api.ApiResponse;
import com.modi.common.web.CurrentUserId;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "events", description = "일정 (구글 캘린더 동기화·직접 입력)")
@RestController
@RequestMapping("/api/events")
public class ScheduleController {

    private final ScheduleService service;

    public ScheduleController(ScheduleService service) {
        this.service = service;
    }

    @Operation(summary = "AI 에 보낼 일정 텍스트 미리보기 (개인정보 마스킹)")
    @PostMapping("/mask-preview")
    public ApiResponse<MaskPreviewResponse> maskPreview(@Valid @RequestBody MaskPreviewRequest request) {
        return ApiResponse.ok(service.maskPreview(request));
    }

    @Operation(summary = "구글 캘린더 일정 동기화")
    @PutMapping("/sync")
    public ApiResponse<List<CalendarEventResponse>> sync(@Parameter(hidden = true) @CurrentUserId UUID userId,
            @Valid @RequestBody EventSyncRequest request) {
        return ApiResponse.ok(service.sync(userId, request));
    }

    @Operation(summary = "일정 직접 입력")
    @PostMapping
    public ApiResponse<CalendarEventResponse> create(@Parameter(hidden = true) @CurrentUserId UUID userId,
            @Valid @RequestBody EventInput request) {
        return ApiResponse.ok(service.create(userId, request));
    }

    @Operation(summary = "일정 목록")
    @GetMapping
    public ApiResponse<List<CalendarEventResponse>> list(@Parameter(hidden = true) @CurrentUserId UUID userId,
            @RequestParam LocalDate from, @RequestParam LocalDate to) {
        return ApiResponse.ok(service.list(userId, from, to));
    }

    @Operation(summary = "일정 삭제")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@Parameter(hidden = true) @CurrentUserId UUID userId, @PathVariable UUID id) {
        service.delete(userId, id);
        return ApiResponse.ok(null);
    }
}
