package com.weekfit.demo;

import com.weekfit.common.config.ClockConfig;
import com.weekfit.common.user.AppUser;
import com.weekfit.schedule.ActivityLevel;
import com.weekfit.schedule.AnalysisSource;
import com.weekfit.schedule.CalendarEvent;
import com.weekfit.schedule.CalendarEventRepository;
import com.weekfit.schedule.EventAnalysis;
import com.weekfit.schedule.Tpo;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 데모 일정. 오늘부터 7일 안에 데모 사용자 일정이 없으면 오늘 기준 상대 날짜로 만든다.
 * 분석 결과를 미리 넣어 두어 LLM 호출 없이 바로 추천을 볼 수 있다.
 */
@Component
public class DemoEventSeed {

    private final CalendarEventRepository repository;
    private final Clock clock;

    public DemoEventSeed(CalendarEventRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    private record Seed(int dayOffset, LocalTime start, int hours, String title, String location, EventAnalysis analysis) {
    }

    @Transactional
    public int seedIfNoUpcoming() {
        UUID userId = AppUser.DEMO_USER_ID;
        LocalDate today = LocalDate.now(clock);
        Instant from = today.atStartOfDay(ClockConfig.ZONE).toInstant();
        Instant to = today.plusDays(7).atStartOfDay(ClockConfig.ZONE).toInstant();
        if (repository.existsByUserIdAndStartsAtGreaterThanEqualAndStartsAtLessThan(userId, from, to)) {
            return 0;
        }
        Instant now = clock.instant();
        List<Seed> seeds = seeds();
        for (Seed s : seeds) {
            Instant start = today.plusDays(s.dayOffset()).atTime(s.start()).atZone(ClockConfig.ZONE).toInstant();
            repository.save(CalendarEvent.create(userId, null, s.title(), s.location(), start,
                    start.plusSeconds(s.hours() * 3600L), s.analysis(), now));
        }
        return seeds.size();
    }

    private static List<Seed> seeds() {
        return List.of(
                new Seed(1, LocalTime.of(10, 0), 1, "팀 주간회의", "본사 3층",
                        analysis(Tpo.WORK, 4, "비즈니스 캐주얼", List.of(), true, ActivityLevel.LOW, 2)),
                new Seed(2, LocalTime.of(14, 0), 2, "고객사 미팅", "강남역 인근",
                        analysis(Tpo.WORK, 4, "비즈니스 캐주얼", List.of(), true, ActivityLevel.MEDIUM, 3)),
                new Seed(3, LocalTime.of(19, 0), 3, "팀 회식", "삼겹살집",
                        analysis(Tpo.WORK, 3, "편한 비즈니스 캐주얼", List.of(), true, ActivityLevel.MEDIUM, 2)),
                new Seed(4, LocalTime.of(12, 0), 3, "[이름] 결혼식", "웨딩홀",
                        analysis(Tpo.FORMAL, 4, "하객 세미정장", List.of("화이트"), true, ActivityLevel.LOW, 5)),
                new Seed(5, LocalTime.of(8, 0), 6, "북한산 등산", "북한산성 입구",
                        analysis(Tpo.OUTDOOR, 1, "기능성 아웃도어", List.of(), false, ActivityLevel.HIGH, 3)),
                new Seed(6, LocalTime.of(18, 30), 3, "소개팅", "성수동 레스토랑",
                        analysis(Tpo.DATE, 3, "깔끔한 캐주얼", List.of(), true, ActivityLevel.LOW, 4)));
    }

    private static EventAnalysis analysis(Tpo tpo, int formality, String dressCode, List<String> avoid, Boolean indoor,
            ActivityLevel activity, int importance) {
        return new EventAnalysis(tpo, formality, dressCode, avoid, indoor, activity, importance, 0.95,
                AnalysisSource.SEED, null);
    }
}
