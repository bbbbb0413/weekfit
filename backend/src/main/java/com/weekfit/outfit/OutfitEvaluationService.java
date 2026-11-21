package com.weekfit.outfit;

import com.weekfit.closet.ClothingItem;
import com.weekfit.closet.ClothingRepository;
import com.weekfit.closet.ClothingService;
import com.weekfit.plan.DayContext;
import com.weekfit.plan.DayContextFactory;
import com.weekfit.plan.Garment;
import com.weekfit.plan.WeeklyPlanner;
import com.weekfit.schedule.ScheduleService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OutfitEvaluationService {

    private final ClothingService clothingService;
    private final ClothingRepository clothingRepository;
    private final ScheduleService scheduleService;
    private final DayContextFactory contextFactory;
    private final EvaluationNarrator narrator;
    private final Clock clock;

    public OutfitEvaluationService(ClothingService clothingService, ClothingRepository clothingRepository,
            ScheduleService scheduleService, DayContextFactory contextFactory, EvaluationNarrator narrator, Clock clock) {
        this.clothingService = clothingService;
        this.clothingRepository = clothingRepository;
        this.scheduleService = scheduleService;
        this.contextFactory = contextFactory;
        this.narrator = narrator;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public OutfitEvaluation evaluate(UUID userId, EvaluateRequest request) {
        List<Garment> outfit = clothingService.findAll(userId, request.itemIds().stream().distinct().toList())
                .stream().map(Garment::of).toList();
        LocalDate date = request.date();
        if (request.eventId() != null) {
            date = scheduleService.get(userId, request.eventId()).getStartsAt()
                    .atZone(com.weekfit.common.config.ClockConfig.ZONE).toLocalDate();
        }
        if (date == null) {
            date = LocalDate.now(clock);
        }
        DayContextFactory.Built built = contextFactory.build(userId, date, 1, request.lat(), request.lon(),
                request.eventId() == null ? request.tpo() : null, request.eventId());
        DayContext ctx = built.days().getFirst();

        Instant wearAt = date.equals(LocalDate.now(clock)) ? clock.instant() : WeeklyPlanner.wearInstant(date);
        List<Garment> closet = clothingRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(Garment::of).toList();
        OutfitRules.Result rules = OutfitRules.evaluate(outfit, ctx, closet, wearAt);

        Optional<EvaluationNarrator.Narrative> narrative = narrator.narrate(outfit, ctx, rules);
        OutfitRules.Checks checks = rules.checks();
        String summary = fallbackSummary(checks);
        if (narrative.isPresent()) {
            EvaluationNarrator.Narrative n = narrative.get();
            if (n.colorScore() != null && n.colorComment() != null && !n.colorComment().isBlank()) {
                checks = new OutfitRules.Checks(checks.weather(), checks.tpo(),
                        EvaluationCheck.of(n.colorScore(), n.colorComment().strip()), checks.laundry());
            }
            if (n.summary() != null && !n.summary().isBlank()) {
                summary = n.summary().strip();
            }
        }
        int score = OutfitRules.total(checks);
        List<String> warnings = new ArrayList<>(rules.structureWarnings());
        warnings.addAll(built.notices());
        return new OutfitEvaluation(score, OutfitRules.grade(score), checks, summary, rules.suggestions(), warnings,
                narrative.isPresent());
    }

    private static String fallbackSummary(OutfitRules.Checks c) {
        EvaluationCheck worst = List.of(c.weather(), c.tpo(), c.color(), c.laundry()).stream()
                .min(Comparator.comparingInt(EvaluationCheck::score)).orElseThrow();
        return worst.ok() ? "전반적으로 잘 어울리는 조합이에요." : worst.message();
    }
}
