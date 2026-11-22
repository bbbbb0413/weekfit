package com.modi.weather;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** 2026-11-22 06:37 UTC 발표 서울 예보(실제 응답에서 쓰는 필드만 남김)로 변환을 확인한다. */
class MetNorwayMapperTest {

    private static final Instant NOW = Instant.parse("2026-11-22T06:30:00Z"); // 15:30 KST

    private OpenMeteoResponse result;

    @BeforeEach
    void setUp() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/weather/met-seoul.json")) {
            MetNorwayResponse met = new ObjectMapper().readValue(in, MetNorwayResponse.class);
            result = MetNorwayMapper.toOpenMeteo(met, NOW, 7);
        }
    }

    @Test
    void currentUsesLatestStepNotAfterNowInKoreanTime() {
        assertThat(result.latitude()).isEqualTo(37.57);
        assertThat(result.longitude()).isEqualTo(126.98);
        assertThat(result.current().time()).isEqualTo("2026-11-22T15:00");
        assertThat(result.current().temperature()).isEqualTo(3.3);
        assertThat(result.current().apparentTemperature()).isEqualTo(1.5);
        assertThat(result.current().weatherCode()).isZero();
        assertThat(result.current().windSpeed()).isCloseTo(1.9 * 3.6, within(0.01));
    }

    @Test
    void hourlyKeepsOnlyOneHourSteps() {
        assertThat(result.hourly().time()).hasSize(60).first().isEqualTo("2026-11-22T15:00");
        assertThat(result.hourly().temperature()).hasSize(60);
        assertThat(result.hourly().apparentTemperature()).hasSize(60);
        assertThat(result.hourly().precipitationProbability()).hasSize(60);
        assertThat(result.hourly().weatherCode()).hasSize(60);
    }

    @Test
    void dailyCoversSevenKoreanDatesFromToday() {
        OpenMeteoResponse.Daily d = result.daily();
        assertThat(d.time()).containsExactly("2026-11-22", "2026-11-23", "2026-11-24", "2026-11-25",
                "2026-11-26", "2026-11-27", "2026-11-28");
        for (int i = 0; i < d.time().size(); i++) {
            assertThat(d.temperatureMin().get(i)).isLessThanOrEqualTo(d.temperatureMax().get(i));
            assertThat(d.apparentMin().get(i)).isLessThanOrEqualTo(d.apparentMax().get(i));
        }
    }

    @Test
    void rainyDayIsRainWithHighProbability() {
        int rainy = result.daily().time().indexOf("2026-11-23");
        assertThat(WeatherCondition.fromWmo(result.daily().weatherCode().get(rainy))).isEqualTo(WeatherCondition.RAIN);
        assertThat(result.daily().precipitationProbabilityMax().get(rainy)).isEqualTo(80);
        assertThat(result.daily().temperatureMin().get(rainy)).isEqualTo(-0.1);
        assertThat(result.daily().temperatureMax().get(rainy)).isEqualTo(10.0);
    }

    @Test
    void dryDayHasNoPrecipitation() {
        int dry = result.daily().time().indexOf("2026-11-24");
        assertThat(result.daily().precipitationProbabilityMax().get(dry)).isZero();
        assertThat(WeatherCondition.fromWmo(result.daily().weatherCode().get(dry)).isWet()).isFalse();
    }

    @Test
    void sixHourShowersUseHourlyRate() {
        int showers = result.daily().time().indexOf("2026-11-27");
        assertThat(WeatherCondition.fromWmo(result.daily().weatherCode().get(showers))).isEqualTo(WeatherCondition.RAIN);
        assertThat(result.daily().precipitationProbabilityMax().get(showers)).isEqualTo(60);
    }

    @Test
    void symbolCodesMapToWmo() {
        assertThat(MetNorwayMapper.wmoCode("clearsky_day")).isZero();
        assertThat(MetNorwayMapper.wmoCode("fair_night")).isEqualTo(1);
        assertThat(MetNorwayMapper.wmoCode("partlycloudy_polartwilight")).isEqualTo(2);
        assertThat(MetNorwayMapper.wmoCode("cloudy")).isEqualTo(3);
        assertThat(MetNorwayMapper.wmoCode("fog")).isEqualTo(45);
        assertThat(MetNorwayMapper.wmoCode("lightrain")).isEqualTo(61);
        assertThat(MetNorwayMapper.wmoCode("heavyrain")).isEqualTo(65);
        assertThat(MetNorwayMapper.wmoCode("lightrainshowers_day")).isEqualTo(80);
        assertThat(MetNorwayMapper.wmoCode("sleet")).isEqualTo(66);
        assertThat(MetNorwayMapper.wmoCode("heavysnowshowers_night")).isEqualTo(75);
        assertThat(MetNorwayMapper.wmoCode("rainandthunder")).isEqualTo(95);
        assertThat(MetNorwayMapper.wmoCode(null)).isNull();
        for (String symbol : new String[] {"sleet", "snow", "rainandthunder", "lightrainshowers_day"}) {
            assertThat(WeatherCondition.fromWmo(MetNorwayMapper.wmoCode(symbol)).isWet()).as(symbol).isTrue();
        }
    }
}
