package com.modi.weather;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class WeatherConditionTest {

    @ParameterizedTest
    @CsvSource({"0,CLEAR", "1,CLEAR", "3,CLOUDY", "45,FOG", "61,RAIN", "81,RAIN", "73,SNOW", "86,SNOW", "95,THUNDER"})
    void mapsWmoCodes(int code, WeatherCondition expected) {
        assertThat(WeatherCondition.fromWmo(code)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({"RAIN,true", "SNOW,true", "CLEAR,false", "CLOUDY,false"})
    void wetConditions(WeatherCondition condition, boolean wet) {
        assertThat(condition.isWet()).isEqualTo(wet);
    }
}
