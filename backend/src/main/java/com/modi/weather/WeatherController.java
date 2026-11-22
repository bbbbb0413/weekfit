package com.modi.weather;

import com.modi.common.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "weather", description = "날씨 (배경 표시·추천 입력)")
@RestController
public class WeatherController {

    private final WeatherService service;

    public WeatherController(WeatherService service) {
        this.service = service;
    }

    @Operation(summary = "현재·시간별·주간 날씨", description = "배경 표시는 current.condition 을 쓴다. 좌표를 생략하면 서울 기준이다.")
    @GetMapping("/api/weather")
    public ApiResponse<WeatherReport> get(@RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon) {
        return ApiResponse.ok(service.report(lat, lon));
    }
}
