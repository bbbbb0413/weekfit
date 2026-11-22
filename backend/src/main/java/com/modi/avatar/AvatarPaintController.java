package com.modi.avatar;

import com.modi.common.api.ApiResponse;
import com.modi.common.web.CurrentUserId;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AvatarPaintController {

    private final AvatarPaintService service;

    public AvatarPaintController(AvatarPaintService service) {
        this.service = service;
    }

    @Operation(summary = "아바타 옷 그림", description = "옷 사진을 보고 AI가 캐릭터(model=mannequin|wave|hip|cross|modi)가 입을 옷을 SVG로 그린다. 옷마다 한 번 그리고 캐시한다")
    @GetMapping("/api/clothes/{id}/avatar-paint")
    public ApiResponse<AvatarPaint> paint(@Parameter(hidden = true) @CurrentUserId UUID userId, @PathVariable UUID id,
            @RequestParam(required = false) String model) {
        return ApiResponse.ok(service.paint(userId, id, AvatarModel.from(model)));
    }
}
