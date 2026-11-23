package com.modi.shopping.look;

import com.modi.closet.ImageUploads;
import com.modi.common.api.ApiResponse;
import com.modi.common.web.CurrentUserId;
import com.modi.shopping.find.FindResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class LookController {

    private final LookService service;
    private final LookFindService findService;

    public LookController(LookService service, LookFindService findService) {
        this.service = service;
        this.findService = findService;
    }

    @Operation(summary = "살까 말까: 코디 사진을 부위별 카드로", description = "사진 속 옷을 부위별로 나눠 제품명, 속성, 위치를 주고, 옷장에 거의 같은 옷이 있으면 함께 알려 준다")
    @PostMapping(value = "/api/shopping/look", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<LookResult> look(@Parameter(hidden = true) @CurrentUserId UUID userId,
            @RequestPart("image") MultipartFile image) throws IOException {
        return ApiResponse.ok(service.analyze(userId, ImageUploads.bytesOf(image)));
    }

    @Operation(summary = "살까 말까: 카드 하나의 가성비 제품 찾기", description = "빈손이면 검색어를 바꿔 최대 3번까지 다시 찾는다. 요청 제한은 1회로 센다")
    @PostMapping(value = "/api/shopping/look/find", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<FindResult> find(@RequestPart(value = "image", required = false) MultipartFile image,
            @RequestParam("queries") String queries) throws IOException {
        // 검색어는 줄바꿈으로 구분해 받음(검색어 안의 쉼표가 나뉘지 않게)
        byte[] bytes = image == null || image.isEmpty() ? null : ImageUploads.bytesOf(image);
        return ApiResponse.ok(findService.find(bytes, List.of(queries.split("\\R"))));
    }
}
