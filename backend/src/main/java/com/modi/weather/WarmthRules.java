package com.modi.weather;

/**
 * 체감 온도와 옷 보온성(1~5)을 잇는 규칙.
 * 기준은 일반적인 기온별 옷차림 가이드를 단순화한 값이며, 개인 보정값(bias)으로 조정한다.
 */
public final class WarmthRules {

    /** 하루 최고·최저 체감 온도 차가 이 값 이상이면 겹쳐 입기를 권한다. */
    public static final double LAYERING_RANGE = 8.0;
    /** 강수 확률이 이 값 이상이면 우천 대비를 권한다. */
    public static final int RAIN_ALERT_PROBABILITY = 50;

    private WarmthRules() {
    }

    public static int requiredWarmth(double apparentTemperature, int warmthBias) {
        int base;
        if (apparentTemperature >= 27) {
            base = 1;
        } else if (apparentTemperature >= 22) {
            base = 2;
        } else if (apparentTemperature >= 16) {
            base = 3;
        } else if (apparentTemperature >= 9) {
            base = 4;
        } else {
            base = 5;
        }
        return clamp(base + warmthBias);
    }

    /** 하루 기준 필요 보온성. 활동 시간대를 고려해 최고 체감 온도에 조금 더 비중을 둔다. */
    public static int requiredWarmth(DailyWeather day, int warmthBias) {
        double effective = day.apparentMax() * 0.6 + day.apparentMin() * 0.4;
        return requiredWarmth(effective, warmthBias);
    }

    public static boolean needsLayering(DailyWeather day) {
        return day.apparentMax() - day.apparentMin() >= LAYERING_RANGE;
    }

    /** 상의(또는 원피스) 보온성에 아우터를 더한 조합 보온성. */
    public static int outfitWarmth(int baseWarmth, Integer outerWarmth) {
        if (outerWarmth == null) {
            return clamp(baseWarmth);
        }
        return clamp(baseWarmth + (outerWarmth + 1) / 2);
    }

    private static int clamp(int value) {
        return Math.max(1, Math.min(5, value));
    }
}
