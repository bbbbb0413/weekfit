package com.weekfit.weather;

/** 화면 배경용 날씨 분류. WMO weather code 를 묶은 값이다. */
public enum WeatherCondition {
    CLEAR, CLOUDY, FOG, RAIN, SNOW, THUNDER;

    /** WMO 4677 code → 분류. https://open-meteo.com/en/docs 의 Weather variable documentation 참고. */
    public static WeatherCondition fromWmo(Integer code) {
        if (code == null) {
            return CLOUDY;
        }
        if (code == 0 || code == 1) {
            return CLEAR;
        }
        if (code == 2 || code == 3) {
            return CLOUDY;
        }
        if (code == 45 || code == 48) {
            return FOG;
        }
        if ((code >= 71 && code <= 77) || code == 85 || code == 86) {
            return SNOW;
        }
        if (code >= 95) {
            return THUNDER;
        }
        if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
            return RAIN;
        }
        return CLOUDY;
    }

    public boolean isWet() {
        return this == RAIN || this == SNOW || this == THUNDER;
    }
}
