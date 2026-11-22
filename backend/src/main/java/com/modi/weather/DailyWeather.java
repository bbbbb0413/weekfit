package com.modi.weather;

import java.time.LocalDate;

public record DailyWeather(
        LocalDate date,
        WeatherCondition condition,
        double temperatureMin,
        double temperatureMax,
        double apparentMin,
        double apparentMax,
        int precipitationProbabilityMax) {
}
