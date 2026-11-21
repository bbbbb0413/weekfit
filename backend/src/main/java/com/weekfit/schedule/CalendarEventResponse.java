package com.weekfit.schedule;

import com.weekfit.common.config.ClockConfig;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CalendarEventResponse(
        UUID id,
        String externalId,
        String title,
        String location,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt,
        EventAnalysis analysis) {

    public static CalendarEventResponse of(CalendarEvent e) {
        return new CalendarEventResponse(e.getId(), e.getExternalId(), e.getTitle(), e.getLocation(),
                e.getStartsAt().atZone(ClockConfig.ZONE).toOffsetDateTime(),
                e.getEndsAt().atZone(ClockConfig.ZONE).toOffsetDateTime(),
                e.analysis());
    }
}
