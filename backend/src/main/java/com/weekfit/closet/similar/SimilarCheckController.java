package com.weekfit.closet.similar;

import com.weekfit.closet.ImageUploads;
import com.weekfit.common.api.ApiResponse;
import com.weekfit.common.web.CurrentUserId;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "closet", description = "옷장 (등록·조회·상태·세탁·보유 검사)")
@RestController
public class SimilarCheckController {

    private final SimilarCheckService service;

    public SimilarCheckController(SimilarCheckService service) {
        this.service = service;
    }

    @Operation(summary = "비슷한 옷 보유 검사",
            description = "사려는 옷의 사진을 올리면 옷장에 비슷한 옷이 있는지와, 함께 입을 수 있는 내 옷의 수를 알려준다.")
    @PostMapping(value = "/api/clothes/similar-check", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<SimilarCheckResult> check(@Parameter(hidden = true) @CurrentUserId UUID userId,
            @RequestPart("image") MultipartFile image) throws IOException {
        return ApiResponse.ok(service.check(userId, ImageUploads.bytesOf(image)));
    }
}
