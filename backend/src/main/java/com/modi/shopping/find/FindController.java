package com.modi.shopping.find;

import com.modi.closet.ImageUploads;
import com.modi.common.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "shopping", description = "사진으로 가성비 옷 찾기")
@RestController
public class FindController {

    private final FindService service;

    public FindController(FindService service) {
        this.service = service;
    }

    @Operation(summary = "가성비 제품 찾기(AI 웹 검색)",
            description = "사진이나 텍스트 속 옷과 비슷하고 더 싼 실제 제품을 최대 2개 찾는다. 30초 이상 걸린다. "
                    + "AI 가 실패해도 200 으로 쇼핑몰 검색 링크(fallbackLinks)를 돌려준다.")
    @PostMapping(value = "/api/shopping/find", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<FindResult> find(@RequestPart(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "text", required = false) String text) throws IOException {
        byte[] bytes = image == null || image.isEmpty() ? null : ImageUploads.bytesOf(image);
        return ApiResponse.ok(service.find(bytes, text));
    }
}
