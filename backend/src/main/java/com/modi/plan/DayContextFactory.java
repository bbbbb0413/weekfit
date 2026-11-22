package com.modi.plan;

import com.modi.common.config.ClockConfig;
import com.modi.common.error.ExternalServiceException;
import com.modi.common.user.UserService;
import com.modi.schedule.CalendarEvent;
import com.modi.schedule.ScheduleService;
import com.modi.schedule.Tpo;
import com.modi.weather.WeatherReport;
import com.modi.weather.WeatherService;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** 기간의 일정·예보·개인 보정값을 모아 날짜별 DayContext 를 만든다. 추천과 옷 평가가 함께 쓴다. */
@Component
public class DayContextFactory {

    private static final Logger log = LoggerFactory.getLogger(DayContextFactory.class);

    public record Built(List<DayContext> days, List<String> notices) {
    }

    private final ScheduleService scheduleService;
    private final WeatherService weatherService;
    private final UserService userService;

    public DayContextFactory(ScheduleService scheduleService, WeatherService weatherService, UserService userService) {
        this.scheduleService = scheduleService;
        this.weatherService = weatherService;
        this.userService = userService;
    }

    public Built build(UUID userId, LocalDate start, int days, Double lat, Double lon, Tpo override, UUID onlyEventId) {
        List<String> notices = new ArrayList<>();
        WeatherReport report = null;
        try {
            report = weatherService.report(lat, lon);
        } catch (ExternalServiceException e) {
            log.warn("Weather unavailable for planning: {}", e.getMessage());
            notices.add("날씨 정보를 불러오지 못해 보통 기온 기준으로 추천했어요.");
        }
        int bias = userService.getOrCreate(userId).getWarmthBias();
        List<CalendarEvent> events = scheduleService.eventsBetween(userId, start, start.plusDays(days - 1L));

        List<DayContext> result = new ArrayList<>();
        boolean outOfRange = false;
        for (int i = 0; i < days; i++) {
            LocalDate date = start.plusDays(i);
            List<DayContext.EventRef> refs = events.stream()
                    .filter(e -> e.getStartsAt().atZone(ClockConfig.ZONE).toLocalDate().equals(date))
                    .filter(e -> onlyEventId == null || e.getId().equals(onlyEventId))
                    .map(e -> new DayContext.EventRef(e.getId(), e.getTitle(),
                            e.getStartsAt().atZone(ClockConfig.ZONE).toOffsetDateTime(), e.analysis()))
                    .toList();
            var daily = report == null ? null : report.dailyOn(date).orElse(null);
            if (report != null && daily == null) {
                outOfRange = true;
            }
            result.add(DayContext.of(date, refs, daily, bias, override));
        }
        if (outOfRange) {
            notices.add("예보는 오늘부터 7일까지만 있어 그 밖의 날은 보통 기온 기준으로 추천했어요.");
        }
        return new Built(result, notices);
    }
}
