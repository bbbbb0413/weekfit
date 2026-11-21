package com.weekfit.shopping;

import com.weekfit.closet.Category;
import com.weekfit.closet.ImageUploads;
import com.weekfit.common.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "shopping", description = "사진으로 가성비 옷 찾기")
@RestController
public class ShoppingController {

    private final ShoppingService service;

    public ShoppingController(ShoppingService service) {
        this.service = service;
    }

    @Operation(summary = "사진으로 가성비 옷 찾기",
            description = "사진 속 옷을 분석해 검색어를 만들고, 쇼핑몰별 낮은 가격순 검색 링크를 돌려준다.")
    @PostMapping(value = "/api/shopping/similar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ShoppingResult> similar(@RequestPart("image") MultipartFile image) throws IOException {
        return ApiResponse.ok(service.fromPhoto(ImageUploads.bytesOf(image)));
    }

    @Operation(summary = "검색어로 쇼핑몰 링크 다시 만들기",
            description = "사용자가 검색어를 고쳤을 때 쓴다. AI 를 호출하지 않는다. category 를 주면 무신사 링크에 카테고리 필터를 붙인다.")
    @GetMapping("/api/shopping/links")
    public ApiResponse<ShoppingResult> links(@RequestParam String query,
            @RequestParam(required = false) Category category) {
        return ApiResponse.ok(service.fromQuery(query, category));
    }
}
