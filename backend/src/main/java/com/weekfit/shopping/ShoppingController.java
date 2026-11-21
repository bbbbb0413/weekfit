package com.weekfit.shopping;

import com.weekfit.closet.ImageUploads;
import com.weekfit.common.api.ApiResponse;
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
public class ShoppingController {

    private final ShoppingService service;

    public ShoppingController(ShoppingService service) {
        this.service = service;
    }

    @Operation(summary = "사진으로 가성비 옷 찾기",
            description = "사진 속 옷의 속성으로 검색어를 만들고, 여러 쇼핑몰의 비슷한 상품을 쇼핑몰별 최저가로 정리한다.")
    @PostMapping(value = "/api/shopping/similar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ShoppingResult> similar(@RequestPart("image") MultipartFile image,
            @RequestParam(required = false) Integer maxPrice) throws IOException {
        return ApiResponse.ok(service.findSimilar(ImageUploads.bytesOf(image), maxPrice));
    }
}
