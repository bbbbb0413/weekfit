package com.weekfit.outfit;

import com.weekfit.ai.Vocabulary;
import com.weekfit.closet.Category;
import com.weekfit.plan.DayContext;
import com.weekfit.plan.Garment;
import com.weekfit.weather.WarmthRules;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** 옷 평가의 규칙 부분. 날씨·TPO·세탁·색 조합(기본값) 점수와 교체 제안을 만든다. */
public final class OutfitRules {

    public record Checks(EvaluationCheck weather, EvaluationCheck tpo, EvaluationCheck color, EvaluationCheck laundry) {
    }

    public record Result(Checks checks, int outfitWarmth, List<String> structureWarnings, List<Suggestion> suggestions) {
    }

    private static final int MAX_SUGGESTIONS = 3;

    private OutfitRules() {
    }

    public static Result evaluate(List<Garment> outfit, DayContext ctx, List<Garment> closet, Instant wearAt) {
        int base = outfit.stream().filter(g -> g.category() == Category.TOP || g.category() == Category.DRESS)
                .mapToInt(Garment::warmth).max()
                .orElse(outfit.stream().mapToInt(Garment::warmth).max().orElse(1));
        Optional<Garment> outer = outfit.stream().filter(g -> g.category() == Category.OUTER)
                .max(Comparator.comparingInt(Garment::warmth));
        int warmth = WarmthRules.outfitWarmth(base, outer.map(Garment::warmth).orElse(null));

        EvaluationCheck weather = weatherCheck(warmth, ctx, outer.isPresent());
        EvaluationCheck tpo = tpoCheck(outfit, ctx);
        EvaluationCheck laundry = laundryCheck(outfit, wearAt);
        EvaluationCheck color = colorCheck(outfit);
        List<Suggestion> suggestions = suggestions(outfit, ctx, closet, wearAt, warmth, outer.orElse(null));
        return new Result(new Checks(weather, tpo, color, laundry), warmth, structure(outfit), suggestions);
    }

    public static int total(Checks c) {
        return (int) Math.round(c.weather().score() * 0.35 + c.tpo().score() * 0.30
                + c.color().score() * 0.20 + c.laundry().score() * 0.15);
    }

    public static String grade(int score) {
        if (score >= 85) {
            return "GREAT";
        }
        if (score >= 70) {
            return "GOOD";
        }
        return score >= 50 ? "FAIR" : "POOR";
    }

    static EvaluationCheck weatherCheck(int warmth, DayContext ctx, boolean hasOuter) {
        int diff = warmth - ctx.requiredWarmth();
        int score = switch (Math.abs(diff)) {
            case 0 -> 100;
            case 1 -> 75;
            case 2 -> 40;
            default -> 10;
        };
        String temp = ctx.weather() == null ? "오늘 날씨"
                : String.format("체감 %.0f~%.0f℃", ctx.weather().apparentMin(), ctx.weather().apparentMax());
        String message = diff < 0
                ? String.format("%s에는 얇아요. 보온 %d단계가 필요한데 지금은 %d단계예요.", temp, ctx.requiredWarmth(), warmth)
                : diff > 0 ? String.format("%s에는 더울 수 있어요. 한 겹 가볍게 입어도 돼요.", temp)
                : temp + "에 잘 맞아요.";
        if (ctx.wet() && !hasOuter) {
            score -= 15;
            message += " 비·눈 예보가 있어 겉옷이 있으면 좋아요.";
        }
        return EvaluationCheck.of(score, message);
    }

    static EvaluationCheck tpoCheck(List<Garment> outfit, DayContext ctx) {
        List<Garment> main = outfit.stream().filter(g -> g.category() != Category.ACCESSORY).toList();
        double avgDiff = main.stream().mapToInt(g -> Math.abs(g.formality() - ctx.targetFormality())).average().orElse(0);
        int score = (int) Math.round(100 - 30 * avgDiff);
        String place = ctx.dressCode() != null ? ctx.dressCode() : tpoLabel(ctx);
        List<String> avoided = outfit.stream()
                .filter(g -> g.colors().stream().anyMatch(ctx.avoidColors()::contains))
                .map(Garment::displayName).toList();
        String message;
        if (!avoided.isEmpty()) {
            score = Math.min(score, 30);
            message = String.format("%s 자리에서는 %s 색을 피하는 게 좋아요: %s", place,
                    String.join(", ", ctx.avoidColors()), String.join(", ", avoided));
        } else if (avgDiff >= 1.5) {
            message = place + " 자리에 비해 격식이 맞지 않아요.";
        } else {
            message = place + " 자리에 잘 맞아요.";
        }
        return EvaluationCheck.of(score, message);
    }

    static EvaluationCheck laundryCheck(List<Garment> outfit, Instant wearAt) {
        List<String> unwearable = outfit.stream().filter(g -> !g.wearableAt(wearAt)
                || g.status() == com.weekfit.closet.ItemStatus.LAUNDRY).map(Garment::displayName).toList();
        if (!unwearable.isEmpty()) {
            return EvaluationCheck.of(0, String.join(", ", unwearable) + "은(는) 지금 세탁·건조·수선 중이에요.");
        }
        List<String> dirty = outfit.stream().filter(g -> g.wearsSinceWash() >= g.washThreshold())
                .map(Garment::displayName).toList();
        if (!dirty.isEmpty()) {
            return EvaluationCheck.of(60, String.join(", ", dirty) + "은(는) 세탁 권장 상태예요.");
        }
        return EvaluationCheck.of(100, "모두 깨끗하게 입을 수 있어요.");
    }

    /** AI 를 쓸 수 없을 때의 색 조합 기본 점수. 유채색 수가 많을수록 낮게 준다. */
    static EvaluationCheck colorCheck(List<Garment> outfit) {
        Set<String> accents = new LinkedHashSet<>();
        int multi = 0;
        for (Garment g : outfit) {
            for (String c : g.colors()) {
                if ("멀티".equals(c)) {
                    multi++;
                } else if (!Vocabulary.NEUTRALS.contains(c)) {
                    accents.add(c);
                }
            }
        }
        int count = accents.size() + multi * 2;
        if (count <= 1) {
            return EvaluationCheck.of(90, "무채색 중심이라 안정적인 조합이에요.");
        }
        if (count == 2) {
            return EvaluationCheck.of(70, "포인트 색이 두 가지예요. 나머지는 무채색으로 맞추면 좋아요.");
        }
        return EvaluationCheck.of(45, "포인트 색이 많아 산만해 보일 수 있어요.");
    }

    private static List<String> structure(List<Garment> outfit) {
        List<String> warnings = new ArrayList<>();
        boolean dress = has(outfit, Category.DRESS);
        if (!dress && !has(outfit, Category.TOP)) {
            warnings.add("상의가 없어요.");
        }
        if (!dress && !has(outfit, Category.BOTTOM)) {
            warnings.add("하의가 없어요.");
        }
        return warnings;
    }

    private static List<Suggestion> suggestions(List<Garment> outfit, DayContext ctx, List<Garment> closet,
            Instant wearAt, int warmth, Garment outer) {
        Set<UUID> inOutfit = new java.util.HashSet<>();
        outfit.forEach(g -> inOutfit.add(g.id()));
        List<Garment> spare = closet.stream()
                .filter(g -> !inOutfit.contains(g.id()))
                .filter(g -> g.wearableAt(wearAt) && g.status() != com.weekfit.closet.ItemStatus.LAUNDRY)
                .filter(g -> g.colors().stream().noneMatch(ctx.avoidColors()::contains))
                .toList();
        List<Suggestion> out = new ArrayList<>();

        int diff = warmth - ctx.requiredWarmth();
        if (diff < 0) {
            int base = outfit.stream().filter(g -> g.category() == Category.TOP || g.category() == Category.DRESS)
                    .mapToInt(Garment::warmth).max().orElse(1);
            spare.stream().filter(g -> g.category() == Category.OUTER)
                    .filter(g -> outer == null || g.warmth() > outer.warmth())
                    .min(Comparator.comparingInt(g -> Math.abs(WarmthRules.outfitWarmth(base, g.warmth()) - ctx.requiredWarmth())))
                    .ifPresent(g -> out.add(new Suggestion(outer == null ? null : outer.id(), g.id(),
                            g.displayName() + "을(를) 걸치면 보온이 맞아요.")));
        } else if (diff >= 2 && outer != null) {
            out.add(new Suggestion(outer.id(), null, outer.displayName() + "은(는) 빼도 괜찮은 날씨예요."));
        }

        for (Garment g : outfit) {
            boolean avoided = g.colors().stream().anyMatch(ctx.avoidColors()::contains);
            boolean unwearable = !g.wearableAt(wearAt) || g.status() == com.weekfit.closet.ItemStatus.LAUNDRY;
            boolean offFormality = Math.abs(g.formality() - ctx.targetFormality()) >= 2;
            if (!(avoided || unwearable || offFormality)) {
                continue;
            }
            String why = avoided ? "피해야 할 색이라" : unwearable ? "지금 입을 수 없어서" : "자리에 비해 격식이 맞지 않아서";
            spare.stream().filter(s -> s.category() == g.category())
                    .min(Comparator.comparingInt((Garment s) -> Math.abs(s.formality() - ctx.targetFormality()))
                            .thenComparing(Garment::id))
                    .ifPresent(s -> out.add(new Suggestion(g.id(), s.id(),
                            g.displayName() + "은(는) " + why + " " + s.displayName() + "을(를) 추천해요.")));
        }
        return out.stream().limit(MAX_SUGGESTIONS).toList();
    }

    private static boolean has(List<Garment> outfit, Category c) {
        return outfit.stream().anyMatch(g -> g.category() == c);
    }

    private static String tpoLabel(DayContext ctx) {
        return switch (ctx.tpo()) {
            case DAILY -> "일상";
            case WORK -> "출근";
            case FORMAL -> "격식";
            case DATE -> "데이트";
            case OUTDOOR -> "야외활동";
            case EXERCISE -> "운동";
        };
    }
}
