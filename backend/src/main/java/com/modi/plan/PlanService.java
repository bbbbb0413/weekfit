package com.modi.plan;

import com.modi.closet.ClothingItem;
import com.modi.closet.ClothingRepository;
import com.modi.closet.ClothingResponse;
import com.modi.common.error.NotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlanService {

    private static final int WEEK = 7;
    private static final int RECENT_DAYS = 2;

    private final ClothingRepository clothingRepository;
    private final DayContextFactory contextFactory;
    private final WeeklyPlanner planner;
    private final OutfitSelector selector;
    private final PlanExplainer explainer;
    private final Clock clock;

    public PlanService(ClothingRepository clothingRepository, DayContextFactory contextFactory, WeeklyPlanner planner,
            OutfitSelector selector, PlanExplainer explainer, Clock clock) {
        this.clothingRepository = clothingRepository;
        this.contextFactory = contextFactory;
        this.planner = planner;
        this.selector = selector;
        this.explainer = explainer;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PlanResponses.WeekPlan week(UUID userId, LocalDate start, Double lat, Double lon) {
        Instant now = clock.instant();
        List<ClothingItem> items = clothingRepository.findByUserIdOrderByCreatedAtDesc(userId);
        DayContextFactory.Built built = contextFactory.build(userId, start, WEEK, lat, lon, null, null);
        WeeklyPlanner.Result result = planner.plan(built.days(), items.stream().map(Garment::of).toList(), now);
        // 코디는 바로 돌려주고 AI 설명은 백그라운드에서 만든다. 일정·옷이 바뀐 직후에도 화면이 기다리지 않게 한다
        PlanExplainer.Explanations texts = explainer.explainInBackground(result.days(), result.laundryTasks());

        Map<UUID, ClothingItem> byId = index(items);
        List<PlanResponses.DayPlan> days = result.days().stream()
                .map(d -> toDayPlan(d, texts.byDate().get(d.context().date()), byId, now, built.notices()))
                .toList();
        return new PlanResponses.WeekPlan(start, days, result.laundryTasks(), result.conflicts(), texts.aiAvailable(),
                texts.pending());
    }

    @Transactional(readOnly = true)
    public PlanResponses.DayPlan day(UUID userId, DayPlanRequest request) {
        Instant now = clock.instant();
        List<ClothingItem> items = clothingRepository.findByUserIdOrderByCreatedAtDesc(userId);
        Map<UUID, ClothingItem> byId = index(items);
        Garment anchor = null;
        if (request.anchorItemId() != null) {
            ClothingItem item = byId.get(request.anchorItemId());
            if (item == null) {
                throw new NotFoundException("고정할 옷을 찾을 수 없습니다.");
            }
            anchor = Garment.of(item);
        }

        DayContextFactory.Built built = contextFactory.build(userId, request.date(), 1, request.lat(), request.lon(),
                request.tpo(), null);
        DayContext ctx = built.days().getFirst();
        Instant wearAt = WeeklyPlanner.wearInstant(request.date());
        UUID anchorId = anchor == null ? null : anchor.id();
        List<Garment> candidates = items.stream().map(Garment::of)
                .filter(g -> g.wearableAt(wearAt) || g.id().equals(anchorId))
                .toList();
        Set<UUID> recent = recentlyWorn(items, request.date());

        Outfit outfit = selector.select(ctx, candidates, recent, anchor).orElse(null);
        List<String> warnings = new ArrayList<>();
        if (outfit == null) {
            warnings.add("입을 수 있는 상의·하의가 부족해 조합을 만들지 못했어요.");
        } else {
            outfit.garments().stream().filter(Garment::needsWashNow)
                    .forEach(g -> warnings.add(g.displayName() + "은(는) 세탁 권장 상태예요. 입기 전에 세탁하세요."));
            if (anchor != null && !anchor.wearableAt(wearAt)) {
                warnings.add(anchor.displayName() + "은(는) 지금 건조·수선 중이에요.");
            }
        }
        WeeklyPlanner.DayResult result = new WeeklyPlanner.DayResult(ctx, outfit, warnings);
        PlanExplainer.Explanations texts = explainer.explain(List.of(result), List.of());
        return toDayPlan(result, texts.byDate().get(request.date()), byId, now, built.notices());
    }

    private Set<UUID> recentlyWorn(List<ClothingItem> items, LocalDate date) {
        Set<UUID> recent = new HashSet<>();
        for (ClothingItem item : items) {
            LocalDate last = item.getLastWornOn();
            if (last != null && last.isBefore(date) && !last.isBefore(date.minusDays(RECENT_DAYS))) {
                recent.add(item.getId());
            }
        }
        return recent;
    }

    private static PlanResponses.DayPlan toDayPlan(WeeklyPlanner.DayResult d, PlanExplainer.Text text,
            Map<UUID, ClothingItem> byId, Instant now, List<String> notices) {
        DayContext c = d.context();
        PlanExplainer.Text t = text == null ? PlanExplainer.template(d) : text;
        PlanResponses.OutfitView outfit = d.outfit() == null ? null : new PlanResponses.OutfitView(
                d.outfit().pieces().stream()
                        .map(p -> new PlanResponses.OutfitItem(p.slot(), ClothingResponse.of(byId.get(p.garment().id()), now)))
                        .toList(),
                d.outfit().warmth());
        List<String> warnings = new ArrayList<>(d.warnings());
        warnings.addAll(notices);
        return new PlanResponses.DayPlan(
                c.date(),
                c.tpo(),
                c.events().stream().map(e -> new PlanResponses.EventView(e.id(), e.title(), e.startsAt(), e.analysis().tpo())).toList(),
                c.weather(),
                c.requiredWarmth(),
                outfit,
                t.reason(),
                t.layeringTip(),
                warnings);
    }

    private static Map<UUID, ClothingItem> index(List<ClothingItem> items) {
        return items.stream().collect(Collectors.toMap(ClothingItem::getId, Function.identity()));
    }
}
