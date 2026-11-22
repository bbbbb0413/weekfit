package com.modi.plan;

import com.modi.common.config.ClockConfig;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * 주간 배정과 세탁 역산.
 * 1) 중요한 날(면접·결혼식 등)부터 옷을 고르고 예약한다.
 * 2) 나머지 날을 날짜순으로 고른다. 3일 안에 예약된 옷과 전날 입은 상의는 뺀다.
 * 3) 날짜순으로 착용 횟수를 시뮬레이션해, 세탁 기준에 닿은 옷을 다시 입는 날이 있으면 건조 시간을 빼서 세탁 마감을 계산한다.
 */
public class WeeklyPlanner {

    public static final LocalTime WEAR_TIME = LocalTime.of(8, 0);
    private static final int PROTECT_DAYS = 3;
    private static final Set<OutfitSlot> RESERVED_SLOTS = EnumSet.of(OutfitSlot.TOP, OutfitSlot.DRESS, OutfitSlot.BOTTOM);
    private static final Set<OutfitSlot> NO_REPEAT_SLOTS = EnumSet.of(OutfitSlot.TOP, OutfitSlot.DRESS);

    public record DayResult(DayContext context, Outfit outfit, List<String> warnings) {
    }

    public record Result(List<DayResult> days, List<LaundryTask> laundryTasks, List<String> conflicts) {
    }

    private final OutfitSelector selector;

    public WeeklyPlanner(OutfitSelector selector) {
        this.selector = selector;
    }

    public Result plan(List<DayContext> days, List<Garment> garments, Instant now) {
        Map<LocalDate, Outfit> assigned = new HashMap<>();
        Map<UUID, List<LocalDate>> reservations = new HashMap<>();

        days.stream()
                .filter(DayContext::important)
                .sorted(Comparator.comparingInt(DayContext::importance).reversed().thenComparing(DayContext::date))
                .forEach(day -> {
                    List<Garment> candidates = garments.stream()
                            .filter(g -> g.wearableAt(wearInstant(day.date())))
                            .filter(g -> !reservedNear(reservations, g.id(), day.date()))
                            .toList();
                    selector.select(day, candidates, Set.of(), null).ifPresent(outfit -> {
                        assigned.put(day.date(), outfit);
                        reserve(reservations, outfit, day.date());
                    });
                });

        List<DayContext> chronological = days.stream().sorted(Comparator.comparing(DayContext::date)).toList();
        for (DayContext day : chronological) {
            if (assigned.containsKey(day.date())) {
                continue;
            }
            Set<UUID> yesterdayTops = used(assigned, day.date().minusDays(1), NO_REPEAT_SLOTS);
            Set<UUID> recent = new HashSet<>(used(assigned, day.date().minusDays(2), NO_REPEAT_SLOTS));
            recent.addAll(used(assigned, day.date().minusDays(1), EnumSet.of(OutfitSlot.BOTTOM)));
            List<Garment> candidates = garments.stream()
                    .filter(g -> g.wearableAt(wearInstant(day.date())))
                    .filter(g -> !yesterdayTops.contains(g.id()))
                    .filter(g -> !reservedSoon(reservations, g.id(), day.date()))
                    .toList();
            selector.select(day, candidates, recent, null).ifPresent(outfit -> assigned.put(day.date(), outfit));
        }
        return simulateLaundry(chronological, assigned, garments, now);
    }

    private Result simulateLaundry(List<DayContext> days, Map<LocalDate, Outfit> assigned, List<Garment> garments,
            Instant now) {
        Map<UUID, Integer> projected = new HashMap<>();
        garments.forEach(g -> projected.put(g.id(), g.needsWashNow() ? g.washThreshold() : g.wearsSinceWash()));

        Map<LocalDate, List<Garment>> washFor = new LinkedHashMap<>();
        Map<LocalDate, List<String>> warnings = new HashMap<>();
        List<String> conflicts = new ArrayList<>();
        for (DayContext day : days) {
            Outfit outfit = assigned.get(day.date());
            List<String> dayWarnings = warnings.computeIfAbsent(day.date(), d -> new ArrayList<>());
            if (outfit == null) {
                dayWarnings.add("입을 수 있는 상의·하의가 부족해 조합을 만들지 못했어요.");
                continue;
            }
            if (outfit.warmth() < day.requiredWarmth() - 1) {
                dayWarnings.add("가진 옷으로는 보온이 부족할 수 있어요. 겹쳐 입기를 권해요.");
            }
            for (Garment g : outfit.garments()) {
                if (projected.get(g.id()) >= g.washThreshold()) {
                    Instant deadline = wearInstant(day.date()).minus(dryTime(g));
                    if (deadline.isBefore(now)) {
                        String msg = String.format("%s을(를) %s에 입으려면 세탁이 필요하지만 마를 시간이 부족해요.",
                                g.displayName(), day.date());
                        conflicts.add(msg);
                        dayWarnings.add(msg);
                    } else {
                        washFor.computeIfAbsent(day.date(), d -> new ArrayList<>()).add(g);
                    }
                    projected.put(g.id(), 0);
                }
                projected.merge(g.id(), 1, Integer::sum);
            }
        }

        List<LaundryTask> tasks = new ArrayList<>();
        washFor.forEach((date, items) -> {
            Instant deadline = items.stream().map(g -> wearInstant(date).minus(dryTime(g))).min(Comparator.naturalOrder())
                    .orElseThrow();
            tasks.add(new LaundryTask(
                    items.stream().map(Garment::id).toList(),
                    items.stream().map(Garment::displayName).toList(),
                    OffsetDateTime.ofInstant(deadline, ClockConfig.ZONE),
                    date,
                    date + " 착용 전에 세탁 기준 횟수에 닿아요. 건조 시간을 고려한 마감이에요."));
        });

        List<DayResult> results = days.stream()
                .map(d -> new DayResult(d, assigned.get(d.date()), List.copyOf(warnings.getOrDefault(d.date(), List.of()))))
                .toList();
        return new Result(results, tasks, conflicts);
    }

    public static Instant wearInstant(LocalDate date) {
        return date.atTime(WEAR_TIME).atZone(ClockConfig.ZONE).toInstant();
    }

    private static Duration dryTime(Garment g) {
        return g.category().defaultDryTime();
    }

    private static void reserve(Map<UUID, List<LocalDate>> reservations, Outfit outfit, LocalDate date) {
        outfit.pieces().stream()
                .filter(p -> RESERVED_SLOTS.contains(p.slot()))
                .forEach(p -> reservations.computeIfAbsent(p.garment().id(), id -> new ArrayList<>()).add(date));
    }

    /** 다른 중요한 날에 예약된 옷이 앞뒤 PROTECT_DAYS 안이면 겹치지 않게 뺀다. */
    private static boolean reservedNear(Map<UUID, List<LocalDate>> reservations, UUID id, LocalDate date) {
        return Optional.ofNullable(reservations.get(id)).orElse(List.of()).stream()
                .anyMatch(r -> Math.abs(r.toEpochDay() - date.toEpochDay()) <= PROTECT_DAYS);
    }

    /** 이 날 이후 PROTECT_DAYS 안에 예약된 옷은 아껴 둔다. */
    private static boolean reservedSoon(Map<UUID, List<LocalDate>> reservations, UUID id, LocalDate date) {
        return Optional.ofNullable(reservations.get(id)).orElse(List.of()).stream()
                .anyMatch(r -> r.isAfter(date) && !r.isAfter(date.plusDays(PROTECT_DAYS)));
    }

    private static Set<UUID> used(Map<LocalDate, Outfit> assigned, LocalDate date, Set<OutfitSlot> slots) {
        Outfit outfit = assigned.get(date);
        if (outfit == null) {
            return Set.of();
        }
        Set<UUID> ids = new HashSet<>();
        outfit.pieces().stream().filter(p -> slots.contains(p.slot())).forEach(p -> ids.add(p.garment().id()));
        return ids;
    }
}
