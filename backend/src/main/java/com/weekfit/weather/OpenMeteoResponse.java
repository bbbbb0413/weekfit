package com.weekfit.weather;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** Open-Meteo /v1/forecast 응답 중 사용하는 필드. */
@JsonIgnoreProperties(ignoreUnknown = true)
record OpenMeteoResponse(double latitude, double longitude, Current current, Hourly hourly, Daily daily) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Current(
            String time,
            @JsonProperty("temperature_2m") Double temperature,
            @JsonProperty("apparent_temperature") Double apparentTemperature,
            @JsonProperty("weather_code") Integer weatherCode,
            @JsonProperty("wind_speed_10m") Double windSpeed) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Hourly(
            List<String> time,
            @JsonProperty("temperature_2m") List<Double> temperature,
            @JsonProperty("apparent_temperature") List<Double> apparentTemperature,
            @JsonProperty("precipitation_probability") List<Integer> precipitationProbability,
            @JsonProperty("weather_code") List<Integer> weatherCode) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Daily(
            List<String> time,
            @JsonProperty("weather_code") List<Integer> weatherCode,
            @JsonProperty("temperature_2m_max") List<Double> temperatureMax,
            @JsonProperty("temperature_2m_min") List<Double> temperatureMin,
            @JsonProperty("apparent_temperature_max") List<Double> apparentMax,
            @JsonProperty("apparent_temperature_min") List<Double> apparentMin,
            @JsonProperty("precipitation_probability_max") List<Integer> precipitationProbabilityMax) {
    }
}
