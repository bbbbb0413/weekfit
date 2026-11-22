package com.modi.schedule;

import com.modi.common.config.ClockConfig;
import com.modi.common.error.NotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleService {

    private static final int MAX_RANGE_DAYS = 62;

    private final CalendarEventRepository repository;
    private final EventAnalyzer analyzer;
    private final EventAnalysisWorker analysisWorker;
    private final Clock clock;

    public ScheduleService(CalendarEventRepository repository, EventAnalyzer analyzer,
            EventAnalysisWorker analysisWorker, Clock clock) {
        this.repository = repository;
        this.analyzer = analyzer;
        this.analysisWorker = analysisWorker;
        this.clock = clock;
    }

    public MaskPreviewResponse maskPreview(MaskPreviewRequest request) {
        PiiMasker.Result title = PiiMasker.mask(request.title());
        PiiMasker.Result location = PiiMasker.mask(request.location());
        return new MaskPreviewResponse(title.text(), location.text(), title.maskedCount() + location.maskedCount());
    }

    /**
     * 기간 안의 외부 일정을 요청 목록과 같게 맞춘다. externalId 로 추가·갱신하고, 목록에 없는 외부 일정은 지운다.
     * 직접 입력한 일정(externalId 없음)은 건드리지 않는다. 바뀐 일정만 다시 분석한다.
     */
    @Transactional
    public List<CalendarEventResponse> sync(UUID userId, EventSyncRequest request) {
        validateRange(request.from(), request.to());
        Instant now = clock.instant();
        List<CalendarEvent> existing = findInRange(userId, request.from(), request.to());
        Map<String, CalendarEvent> byExternalId = new HashMap<>();
        for (CalendarEvent e : existing) {
            if (e.getExternalId() != null) {
                byExternalId.put(e.getExternalId(), e);
            }
        }

        Set<String> seen = new HashSet<>();
        List<CalendarEvent> toAnalyze = new ArrayList<>();
        List<EventAnalyzer.Input> inputs = new ArrayList<>();
        for (EventInput in : request.events()) {
            if (in.externalId() == null || in.externalId().isBlank()) {
                throw new IllegalArgumentException("동기화 일정에는 externalId 가 필요합니다.");
            }
            if (!seen.add(in.externalId())) {
                continue;
            }
            Masked m = mask(in);
            CalendarEvent current = byExternalId.get(in.externalId());
            if (current == null) {
                current = CalendarEvent.create(userId, in.externalId(), m.title(), m.location(), m.startsAt(), m.endsAt(),
                        RuleBasedEventClassifier.classify(m.title(), m.location()), now);
                current = repository.save(current);
            } else if (current.contentDiffers(m.title(), m.location(), m.startsAt(), m.endsAt())) {
                current.updateContent(m.title(), m.location(), m.startsAt(), m.endsAt(), now);
            } else {
                continue;
            }
            toAnalyze.add(current);
            inputs.add(m.toInput(in));
        }
        for (CalendarEvent e : existing) {
            if (e.getExternalId() != null && !seen.contains(e.getExternalId())) {
                repository.delete(e);
            }
        }
        applyAnalyses(toAnalyze, inputs, now);
        return findInRange(userId, request.from(), request.to()).stream().map(CalendarEventResponse::of).toList();
    }

    @Transactional
    public CalendarEventResponse create(UUID userId, EventInput in) {
        Instant now = clock.instant();
        Masked m = mask(in);
        // 규칙 분석으로 먼저 저장해 바로 응답하고, AI 분석은 커밋 뒤 백그라운드에서 덮어쓴다
        EventAnalysis rules = RuleBasedEventClassifier.classify(m.title(), m.location());
        CalendarEvent saved = repository.save(CalendarEvent.create(userId, null, m.title(), m.location(),
                m.startsAt(), m.endsAt(), rules, now));
        analysisWorker.analyzeAfterCommit(saved.getId(), m.toInput(in));
        return CalendarEventResponse.of(saved);
    }

    @Transactional(readOnly = true)
    public List<CalendarEventResponse> list(UUID userId, LocalDate from, LocalDate to) {
        validateRange(from, to);
        return findInRange(userId, from, to).stream().map(CalendarEventResponse::of).toList();
    }

    @Transactional(readOnly = true)
    public List<CalendarEvent> eventsBetween(UUID userId, LocalDate from, LocalDate toInclusive) {
        return findInRange(userId, from, toInclusive);
    }

    @Transactional(readOnly = true)
    public CalendarEvent get(UUID userId, UUID id) {
        return repository.findByIdAndUserId(id, userId).orElseThrow(() -> new NotFoundException("일정을 찾을 수 없습니다."));
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        repository.delete(get(userId, id));
    }

    private void applyAnalyses(List<CalendarEvent> events, List<EventAnalyzer.Input> inputs, Instant now) {
        if (events.isEmpty()) {
            return;
        }
        List<EventAnalysis> analyses = analyzer.analyze(inputs);
        for (int i = 0; i < events.size(); i++) {
            events.get(i).applyAnalysis(analyses.get(i), now);
        }
    }

    private List<CalendarEvent> findInRange(UUID userId, LocalDate from, LocalDate toInclusive) {
        Instant start = from.atStartOfDay(ClockConfig.ZONE).toInstant();
        Instant end = toInclusive.plusDays(1).atStartOfDay(ClockConfig.ZONE).toInstant();
        return repository.findByUserIdAndStartsAtGreaterThanEqualAndStartsAtLessThanOrderByStartsAtAsc(userId, start, end);
    }

    private static void validateRange(LocalDate from, LocalDate to) {
        if (to.isBefore(from) || from.plusDays(MAX_RANGE_DAYS).isBefore(to)) {
            throw new IllegalArgumentException("기간은 from <= to 이고 62일 이내여야 합니다.");
        }
    }

    private static Masked mask(EventInput in) {
        if (in.endsAt().isBefore(in.startsAt())) {
            throw new IllegalArgumentException("endsAt 은 startsAt 이후여야 합니다.");
        }
        String title = PiiMasker.mask(in.title()).text();
        String location = in.location() == null || in.location().isBlank() ? null : PiiMasker.mask(in.location()).text();
        return new Masked(title, location, in.startsAt().toInstant(), in.endsAt().toInstant());
    }

    private record Masked(String title, String location, Instant startsAt, Instant endsAt) {
        EventAnalyzer.Input toInput(EventInput in) {
            return new EventAnalyzer.Input(title, location,
                    startsAt.atZone(ClockConfig.ZONE).toOffsetDateTime(), endsAt.atZone(ClockConfig.ZONE).toOffsetDateTime());
        }
    }
}
