package com.modi.outfit;

import com.modi.schedule.Tpo;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record EvaluateRequest(
        @NotEmpty @Size(max = 10) List<UUID> itemIds,
        LocalDate date,
        UUID eventId,
        Tpo tpo,
        Double lat,
        Double lon,
        // false 면 AI 설명 없이 규칙 점수만 돌려줌(비용 0). 비우면 예전처럼 AI 설명까지
        Boolean ai) {

    public boolean wantsAi() {
        return ai == null || ai;
    }
}
