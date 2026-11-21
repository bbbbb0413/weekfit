package com.weekfit.weather;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public record WeatherReport(
        double latitude,
        double longitude,
        Current current,
        List<Hourly> hourly,
        List<DailyWeather> daily) {

    public record Current(
            OffsetDateTime time,
            double temperature,
            double apparentTemperature,
            int precipitationProbability,
            double windSpeed,
            WeatherCondition condition) {
    }

    public record Hourly(
            OffsetDateTime time,
            double temperature,
            double apparentTemperature,
            int precipitationProbability,
            WeatherCondition condition) {
    }

    public Optional<DailyWeather> dailyOn(LocalDate date) {
        return daily.stream().filter(d -> d.date().equals(date)).findFirst();
    }
}
