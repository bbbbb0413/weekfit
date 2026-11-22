package com.modi.closet;

import com.modi.common.api.ApiResponse;
import com.modi.common.web.CurrentUserId;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "closet", description = "옷장 (등록·조회·상태·세탁·보유 검사)")
@RestController
@RequestMapping("/api")
public class ClothingController {

    private final ClothingService service;

    public ClothingController(ClothingService service) {
        this.service = service;
    }

    @Operation(summary = "옷 사진 업로드 + AI 태깅 제안")
    @PostMapping(value = "/clothes/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ClothingAnalysisResult> analyze(@Parameter(hidden = true) @CurrentUserId UUID userId,
            @RequestPart("image") MultipartFile image) throws IOException {
        return ApiResponse.ok(service.analyze(ImageUploads.bytesOf(image)));
    }

    @Operation(summary = "옷 저장")
    @PostMapping("/clothes")
    public ApiResponse<ClothingResponse> create(@Parameter(hidden = true) @CurrentUserId UUID userId,
            @Valid @RequestBody ClothingCreateRequest request) {
        return ApiResponse.ok(service.create(userId, request));
    }

    @Operation(summary = "옷 목록")
    @GetMapping("/clothes")
    public ApiResponse<List<ClothingResponse>> list(@Parameter(hidden = true) @CurrentUserId UUID userId,
            @RequestParam(required = false) Category category,
            @RequestParam(required = false) ItemStatus status) {
        return ApiResponse.ok(service.list(userId, category, status));
    }

    @Operation(summary = "옷 단건 조회")
    @GetMapping("/clothes/{id}")
    public ApiResponse<ClothingResponse> get(@Parameter(hidden = true) @CurrentUserId UUID userId, @PathVariable UUID id) {
        return ApiResponse.ok(service.get(userId, id));
    }

    @Operation(summary = "옷 속성 수정")
    @PatchMapping("/clothes/{id}")
    public ApiResponse<ClothingResponse> update(@Parameter(hidden = true) @CurrentUserId UUID userId, @PathVariable UUID id,
            @Valid @RequestBody ClothingSpec spec) {
        return ApiResponse.ok(service.update(userId, id, spec));
    }

    @Operation(summary = "옷 삭제")
    @DeleteMapping("/clothes/{id}")
    public ApiResponse<Void> delete(@Parameter(hidden = true) @CurrentUserId UUID userId, @PathVariable UUID id) {
        service.delete(userId, id);
        return ApiResponse.ok(null);
    }

    @Operation(summary = "옷 상태 수동 변경")
    @PatchMapping("/clothes/{id}/status")
    public ApiResponse<ClothingResponse> changeStatus(@Parameter(hidden = true) @CurrentUserId UUID userId,
            @PathVariable UUID id, @Valid @RequestBody StatusChangeRequest request) {
        return ApiResponse.ok(service.changeStatus(userId, id, request.status()));
    }

    @Operation(summary = "세탁 시작")
    @PostMapping("/laundry")
    public ApiResponse<List<ClothingResponse>> laundry(@Parameter(hidden = true) @CurrentUserId UUID userId,
            @Valid @RequestBody LaundryRequest request) {
        return ApiResponse.ok(service.startLaundry(userId, request));
    }
}
