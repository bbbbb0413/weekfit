package com.modi.plan;

import com.modi.ai.Vocabulary;
import com.modi.closet.Category;
import com.modi.schedule.ActivityLevel;
import com.modi.weather.WarmthRules;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * 하루 조건에 맞는 한 벌을 고른다. 점수 규칙:
 * 격식 차이 감점, 선호 스타일 가점, 피할 색 큰 감점, 최근 착용 감점, 세탁 필요 감점(중요한 날은 작게),
 * 보온성은 상의·아우터 조합 기준으로 필요 보온과의 차이를 감점한다.
 */
public class OutfitSelector {

    private static final double FORMALITY_WEIGHT = 2.0;
    private static final double AVOID_COLOR_PENALTY = 6.0;
    private static final double RECENT_PENALTY = 2.5;
    private static final double WASH_PENALTY = 2.0;
    private static final double WASH_PENALTY_IMPORTANT = 0.5;
    private static final double WARMTH_WEIGHT = 2.0;

    public Optional<Outfit> select(DayContext ctx, List<Garment> candidates, Set<UUID> recentlyUsed, Garment anchor) {
        List<Outfit.Piece> pieces = new ArrayList<>();
        if (anchor != null) {
            pieces.add(new Outfit.Piece(OutfitSlot.of(anchor.category()), anchor));
        }
        boolean hasDress = has(pieces, OutfitSlot.DRESS);
        boolean hasTopOrBottom = has(pieces, OutfitSlot.TOP) || has(pieces, OutfitSlot.BOTTOM);
        int baseTarget = ctx.requiredWarmth() >= 4 ? 3 : ctx.requiredWarmth();

        if (!hasDress) {
            Garment top = pieceOr(pieces, OutfitSlot.TOP);
            Garment bottom = pieceOr(pieces, OutfitSlot.BOTTOM);
            Optional<Garment> dress = hasTopOrBottom ? Optional.empty()
                    : best(candidates, Category.DRESS, g -> score(g, ctx, recentlyUsed) - warmthGap(g, baseTarget) * 1.2);
            if (top == null) {
                top = best(candidates, Category.TOP, g -> score(g, ctx, recentlyUsed) - warmthGap(g, baseTarget) * 1.2)
                        .orElse(null);
            }
            if (bottom == null) {
                Garment chosenTop = top;
                bottom = best(candidates, Category.BOTTOM, g -> score(g, ctx, recentlyUsed) + harmony(chosenTop, g))
                        .orElse(null);
            }
            double pairScore = top == null || bottom == null ? Double.NEGATIVE_INFINITY
                    : score(top, ctx, recentlyUsed) + score(bottom, ctx, recentlyUsed);
            if (dress.isPresent() && 2 * score(dress.get(), ctx, recentlyUsed) > pairScore) {
                pieces.removeIf(p -> p.slot() == OutfitSlot.TOP || p.slot() == OutfitSlot.BOTTOM);
                pieces.add(new Outfit.Piece(OutfitSlot.DRESS, dress.get()));
            } else {
                if (top == null || bottom == null) {
                    return Optional.empty();
                }
                addIfAbsent(pieces, OutfitSlot.TOP, top);
                addIfAbsent(pieces, OutfitSlot.BOTTOM, bottom);
            }
        }

        int baseWarmth = pieces.stream()
                .filter(p -> p.slot() == OutfitSlot.TOP || p.slot() == OutfitSlot.DRESS)
                .mapToInt(p -> p.garment().warmth()).max().orElse(1);
        if (!has(pieces, OutfitSlot.OUTER)) {
            chooseOuter(ctx, candidates, recentlyUsed, baseWarmth).ifPresent(o -> pieces.add(new Outfit.Piece(OutfitSlot.OUTER, o)));
        }
        if (!has(pieces, OutfitSlot.SHOES)) {
            best(candidates, Category.SHOES, g -> score(g, ctx, Set.of())
                    - (ctx.wet() && g.colors().contains("화이트") ? 1.0 : 0.0))
                    .ifPresent(s -> pieces.add(new Outfit.Piece(OutfitSlot.SHOES, s)));
        }
        Integer outerWarmth = pieces.stream().filter(p -> p.slot() == OutfitSlot.OUTER)
                .map(p -> p.garment().warmth()).findFirst().orElse(null);
        int warmth = WarmthRules.outfitWarmth(baseWarmth, outerWarmth);
        pieces.sort(Comparator.comparing(Outfit.Piece::slot));
        return Optional.of(new Outfit(pieces, warmth, reasons(ctx, warmth, outerWarmth != null)));
    }

    private Optional<Garment> chooseOuter(DayContext ctx, List<Garment> candidates, Set<UUID> recent, int baseWarmth) {
        double withoutOuter = -WARMTH_WEIGHT * Math.abs(baseWarmth - ctx.requiredWarmth())
                - (ctx.wet() ? 1.0 : 0.0) - (ctx.layering() ? 1.0 : 0.0);
        Optional<Garment> best = best(candidates, Category.OUTER, g -> outerScore(g, ctx, recent, baseWarmth));
        if (best.isPresent() && outerScore(best.get(), ctx, recent, baseWarmth) > withoutOuter) {
            return best;
        }
        return Optional.empty();
    }

    private double outerScore(Garment g, DayContext ctx, Set<UUID> recent, int baseWarmth) {
        int combined = WarmthRules.outfitWarmth(baseWarmth, g.warmth());
        double s = score(g, ctx, recent) * 0.5 - WARMTH_WEIGHT * Math.abs(combined - ctx.requiredWarmth());
        if (ctx.wet() && g.styles().contains("아웃도어")) {
            s += 1.0;
        }
        return s;
    }

    double score(Garment g, DayContext ctx, Set<UUID> recent) {
        double s = -FORMALITY_WEIGHT * Math.abs(g.formality() - ctx.targetFormality());
        s += Math.min(2, g.styles().stream().filter(ctx.preferredStyles()::contains).count());
        if (g.colors().stream().anyMatch(ctx.avoidColors()::contains)) {
            s -= AVOID_COLOR_PENALTY;
        }
        if (recent.contains(g.id())) {
            s -= RECENT_PENALTY;
        }
        if (g.needsWashNow()) {
            s -= ctx.important() ? WASH_PENALTY_IMPORTANT : WASH_PENALTY;
        }
        if (ctx.activity() == ActivityLevel.HIGH && (g.styles().contains("스포티") || g.styles().contains("아웃도어"))) {
            s += 1.0;
        }
        return s;
    }

    private static double warmthGap(Garment g, int target) {
        return Math.abs(g.warmth() - target);
    }

    /** 무채색이 하나라도 있으면 무난, 유채색끼리 겹치지 않으면 감점. */
    static double harmony(Garment top, Garment bottom) {
        if (top == null) {
            return 0;
        }
        boolean topNeutral = Vocabulary.NEUTRALS.containsAll(top.colors());
        boolean bottomNeutral = Vocabulary.NEUTRALS.containsAll(bottom.colors());
        if (topNeutral || bottomNeutral) {
            return 0.5;
        }
        return top.colors().stream().anyMatch(bottom.colors()::contains) ? 0 : -1.0;
    }

    private static Optional<Garment> best(List<Garment> candidates, Category category,
            java.util.function.ToDoubleFunction<Garment> scorer) {
        return candidates.stream()
                .filter(g -> g.category() == category)
                .max(Comparator.comparingDouble(scorer).thenComparing(Garment::id));
    }

    private static boolean has(List<Outfit.Piece> pieces, OutfitSlot slot) {
        return pieces.stream().anyMatch(p -> p.slot() == slot);
    }

    private static Garment pieceOr(List<Outfit.Piece> pieces, OutfitSlot slot) {
        return pieces.stream().filter(p -> p.slot() == slot).map(Outfit.Piece::garment).findFirst().orElse(null);
    }

    private static void addIfAbsent(List<Outfit.Piece> pieces, OutfitSlot slot, Garment g) {
        if (!has(pieces, slot)) {
            pieces.add(new Outfit.Piece(slot, g));
        }
    }

    private static List<String> reasons(DayContext ctx, int warmth, boolean hasOuter) {
        List<String> reasons = new ArrayList<>();
        if (ctx.dressCode() != null) {
            reasons.add(ctx.dressCode() + " 기준으로 골랐어요.");
        }
        if (!ctx.avoidColors().isEmpty()) {
            reasons.add("이 자리에서 피하는 색(" + String.join(", ", ctx.avoidColors()) + ")은 뺐어요.");
        }
        if (ctx.weather() != null) {
            reasons.add(String.format("체감 %.0f~%.0f℃에 맞춰 보온 %d단계로 맞췄어요.",
                    ctx.weather().apparentMin(), ctx.weather().apparentMax(), warmth));
        }
        if (ctx.layering() && hasOuter) {
            reasons.add("일교차가 커서 벗을 수 있는 겉옷을 더했어요.");
        }
        if (ctx.wet()) {
            reasons.add("비·눈 예보가 있어 젖어도 괜찮은 조합을 우선했어요.");
        }
        return reasons;
    }
}
