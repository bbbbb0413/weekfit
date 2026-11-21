package com.weekfit.weather;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class WarmthRulesTest {

    @ParameterizedTest
    @CsvSource({"30,0,1", "24,0,2", "18,0,3", "12,0,4", "3,0,5", "12,1,5", "12,-2,2", "3,2,5", "30,-2,1"})
    void requiredWarmthByApparentTemperatureAndBias(double apparent, int bias, int expected) {
        assertThat(WarmthRules.requiredWarmth(apparent, bias)).isEqualTo(expected);
    }

    @Test
    void suggestsLayeringWhenDailyRangeIsWide() {
        DailyWeather wide = new DailyWeather(LocalDate.of(2026, 11, 22), WeatherCondition.CLEAR, 2, 15, 0, 13, 0);
        DailyWeather narrow = new DailyWeather(LocalDate.of(2026, 11, 22), WeatherCondition.CLEAR, 10, 14, 9, 13, 0);

        assertThat(WarmthRules.needsLayering(wide)).isTrue();
        assertThat(WarmthRules.needsLayering(narrow)).isFalse();
    }

    @Test
    void outerAddsHalfOfItsWarmth() {
        assertThat(WarmthRules.outfitWarmth(2, null)).isEqualTo(2);
        assertThat(WarmthRules.outfitWarmth(2, 5)).isEqualTo(5);
        assertThat(WarmthRules.outfitWarmth(3, 3)).isEqualTo(5);
        assertThat(WarmthRules.outfitWarmth(2, 2)).isEqualTo(3);
    }
}
