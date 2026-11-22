package com.modi.weather;

import com.modi.common.config.ClockConfig;
import com.modi.weather.MetNorwayResponse.Period;
import com.modi.weather.MetNorwayResponse.PointDetails;
import com.modi.weather.MetNorwayResponse.Step;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * MET Norway 예보를 Open-Meteo 응답 형식으로 바꾼다. 이후 변환은 WeatherService 가 그대로 맡는다.
 * 한국 좌표에는 강수확률이 없어 날씨 기호와 시간당 강수량으로 추정한다.
 */
final class MetNorwayMapper {

    private static final double MS_TO_KMH = 3.6;
    private static final double HEAVY_MM_PER_HOUR = 1.0;

    private MetNorwayMapper() {
    }

    static OpenMeteoResponse toOpenMeteo(MetNorwayResponse met, Instant now, int days) {
        List<Step> steps = met.properties() == null || met.properties().timeseries() == null
                ? List.of() : met.properties().timeseries();
        if (steps.isEmpty()) {
            throw new IllegalArgumentException("MET Norway 예보가 비어 있습니다.");
        }
        List<Double> coordinates = met.geometry() == null ? List.of() : met.geometry().coordinates();
        double lon = coordinates.size() > 0 ? coordinates.get(0) : 0;
        double lat = coordinates.size() > 1 ? coordinates.get(1) : 0;
        return new OpenMeteoResponse(lat, lon, current(steps, now), hourly(steps), daily(steps, now, days));
    }

    private static OpenMeteoResponse.Current current(List<Step> steps, Instant now) {
        Step chosen = steps.getFirst();
        for (Step step : steps) {
            if (Instant.parse(step.time()).isAfter(now)) {
                break;
            }
            chosen = step;
        }
        PointDetails p = point(chosen);
        Double wind = p.windSpeed() == null ? null : p.windSpeed() * MS_TO_KMH;
        return new OpenMeteoResponse.Current(localTime(chosen), p.airTemperature(), p.apparentTemperature(),
                wmoCode(symbol(period(chosen))), wind);
    }

    private static OpenMeteoResponse.Hourly hourly(List<Step> steps) {
        List<String> time = new ArrayList<>();
        List<Double> temperature = new ArrayList<>();
        List<Double> apparent = new ArrayList<>();
        List<Integer> probability = new ArrayList<>();
        List<Integer> code = new ArrayList<>();
        for (Step step : steps) {
            Period next = step.data() == null ? null : step.data().next1Hours();
            if (next == null) {
                continue;
            }
            PointDetails p = point(step);
            time.add(localTime(step));
            temperature.add(p.airTemperature());
            apparent.add(p.apparentTemperature());
            probability.add(precipitationProbability(next, 1));
            code.add(wmoCode(symbol(next)));
        }
        return new OpenMeteoResponse.Hourly(time, temperature, apparent, probability, code);
    }

    private static OpenMeteoResponse.Daily daily(List<Step> steps, Instant now, int days) {
        LocalDate today = LocalDate.ofInstant(now, ClockConfig.ZONE);
        Map<LocalDate, DayAccumulator> byDate = new TreeMap<>();
        for (Step step : steps) {
            LocalDate date = LocalDate.ofInstant(Instant.parse(step.time()), ClockConfig.ZONE);
            if (!date.isBefore(today)) {
                byDate.computeIfAbsent(date, d -> new DayAccumulator()).add(step);
            }
        }
        List<String> time = new ArrayList<>();
        List<Integer> code = new ArrayList<>();
        List<Double> max = new ArrayList<>();
        List<Double> min = new ArrayList<>();
        List<Double> apparentMax = new ArrayList<>();
        List<Double> apparentMin = new ArrayList<>();
        List<Integer> probability = new ArrayList<>();
        byDate.entrySet().stream().limit(days).forEach(e -> {
            DayAccumulator day = e.getValue();
            time.add(e.getKey().toString());
            code.add(day.worstCode);
            max.add(day.max);
            min.add(day.min);
            apparentMax.add(Math.max(day.apparentMax, day.max + day.averageOffset()));
            apparentMin.add(Math.min(day.apparentMin, day.min + day.averageOffset()));
            probability.add(day.probability);
        });
        return new OpenMeteoResponse.Daily(time, code, max, min, apparentMax, apparentMin, probability);
    }

    /** MET Norway symbol_code → WMO 4677 code. WeatherCondition.fromWmo 로 분류할 수 있는 값만 쓴다. */
    static Integer wmoCode(String symbol) {
        if (symbol == null) {
            return null;
        }
        String s = symbol.replaceAll("_(day|night|polartwilight)$", "");
        boolean light = s.startsWith("light");
        boolean heavy = s.startsWith("heavy");
        if (s.contains("thunder")) {
            return 95;
        }
        if (s.contains("sleet")) {
            return heavy ? 67 : 66;
        }
        if (s.contains("snow")) {
            return light ? 71 : heavy ? 75 : 73;
        }
        if (s.contains("rain")) {
            if (s.contains("showers")) {
                return light ? 80 : heavy ? 82 : 81;
            }
            return light ? 61 : heavy ? 65 : 63;
        }
        if (s.equals("fog")) {
            return 45;
        }
        if (s.equals("partlycloudy")) {
            return 2;
        }
        if (s.equals("fair")) {
            return 1;
        }
        if (s.equals("clearsky")) {
            return 0;
        }
        return 3;
    }

    /** 강수확률 추정: 비·눈 기호이면서 시간당 1mm 이상 80, 비·눈 기호 60, 강수량만 있으면 30, 그 외 0. */
    static int precipitationProbability(Period period, int hours) {
        if (period == null) {
            return 0;
        }
        Integer code = wmoCode(symbol(period));
        boolean wet = code != null && WeatherCondition.fromWmo(code).isWet();
        double amount = period.details() == null || period.details().precipitationAmount() == null
                ? 0 : period.details().precipitationAmount();
        if (wet && amount / hours >= HEAVY_MM_PER_HOUR) {
            return 80;
        }
        if (wet) {
            return 60;
        }
        return amount > 0 ? 30 : 0;
    }

    private static Period period(Step step) {
        if (step.data() == null) {
            return null;
        }
        return step.data().next1Hours() != null ? step.data().next1Hours() : step.data().next6Hours();
    }

    private static int hoursOf(Step step) {
        return step.data() != null && step.data().next1Hours() != null ? 1 : 6;
    }

    private static String symbol(Period period) {
        return period == null || period.summary() == null ? null : period.summary().symbolCode();
    }

    private static PointDetails point(Step step) {
        if (step.data() == null || step.data().instant() == null || step.data().instant().details() == null) {
            return new PointDetails(null, null, null);
        }
        return step.data().instant().details();
    }

    private static String localTime(Step step) {
        return LocalDateTime.ofInstant(Instant.parse(step.time()), ClockConfig.ZONE)
                .truncatedTo(ChronoUnit.MINUTES).toString();
    }

    private static int severity(Integer code) {
        if (code == null) {
            return -1;
        }
        return switch (WeatherCondition.fromWmo(code)) {
            case THUNDER -> 5;
            case SNOW -> 4;
            case RAIN -> 3;
            case FOG -> 2;
            case CLOUDY -> 1;
            case CLEAR -> 0;
        };
    }

    /** 한 날짜에 속한 예보 시점들을 모아 일별 최저·최고와 가장 궂은 날씨를 구한다. */
    private static final class DayAccumulator {
        double min = Double.POSITIVE_INFINITY;
        double max = Double.NEGATIVE_INFINITY;
        double apparentMin = Double.POSITIVE_INFINITY;
        double apparentMax = Double.NEGATIVE_INFINITY;
        double offsetSum;
        int offsetCount;
        Integer worstCode;
        int probability;

        void add(Step step) {
            PointDetails p = point(step);
            if (p.airTemperature() != null) {
                min = Math.min(min, p.airTemperature());
                max = Math.max(max, p.airTemperature());
            }
            if (p.apparentTemperature() != null) {
                apparentMin = Math.min(apparentMin, p.apparentTemperature());
                apparentMax = Math.max(apparentMax, p.apparentTemperature());
            }
            if (p.airTemperature() != null && p.apparentTemperature() != null) {
                offsetSum += p.apparentTemperature() - p.airTemperature();
                offsetCount++;
            }
            Period period = period(step);
            if (period == null) {
                return;
            }
            // 6시간 단위 구간만 그 구간의 최저·최고를 더한다. 1시간 단위 날은 시점 값으로 충분하다
            if (hoursOf(step) == 6 && period.details() != null) {
                if (period.details().airTemperatureMin() != null) {
                    min = Math.min(min, period.details().airTemperatureMin());
                }
                if (period.details().airTemperatureMax() != null) {
                    max = Math.max(max, period.details().airTemperatureMax());
                }
            }
            Integer code = wmoCode(symbol(period));
            if (worstCode == null || severity(code) > severity(worstCode)
                    || (severity(code) == severity(worstCode) && code != null && code > worstCode)) {
                worstCode = code;
            }
            probability = Math.max(probability, precipitationProbability(period, hoursOf(step)));
        }

        double averageOffset() {
            return offsetCount == 0 ? 0 : offsetSum / offsetCount;
        }
    }
}
