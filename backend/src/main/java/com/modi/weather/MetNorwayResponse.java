package com.modi.weather;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** MET Norway locationforecast/2.0/complete 응답 중 사용하는 필드. 시간은 UTC 이다. */
@JsonIgnoreProperties(ignoreUnknown = true)
record MetNorwayResponse(Geometry geometry, Properties properties) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Geometry(List<Double> coordinates) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Properties(List<Step> timeseries) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Step(String time, Data data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Data(
            Point instant,
            @JsonProperty("next_1_hours") Period next1Hours,
            @JsonProperty("next_6_hours") Period next6Hours) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Point(PointDetails details) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record PointDetails(
            @JsonProperty("air_temperature") Double airTemperature,
            @JsonProperty("apparent_air_temperature") Double apparentTemperature,
            @JsonProperty("wind_speed") Double windSpeed) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Period(Summary summary, PeriodDetails details) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Summary(@JsonProperty("symbol_code") String symbolCode) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record PeriodDetails(
            @JsonProperty("precipitation_amount") Double precipitationAmount,
            @JsonProperty("air_temperature_max") Double airTemperatureMax,
            @JsonProperty("air_temperature_min") Double airTemperatureMin) {
    }
}
