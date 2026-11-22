package com.modi.weather;

import com.modi.common.config.ClockConfig;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class WeatherService {

    public static final double DEFAULT_LATITUDE = 37.5665;
    public static final double DEFAULT_LONGITUDE = 126.9780;
    private static final Duration CACHE_TTL = Duration.ofMinutes(30);
    private static final int HOURS = 24;
    private static final ZoneOffset OFFSET = ZoneOffset.ofHours(9);

    private final OpenMeteoClient client;
    private final Clock clock;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    public WeatherService(OpenMeteoClient client, Clock clock) {
        this.client = client;
        this.clock = clock;
    }

    public WeatherReport report(Double latitude, Double longitude) {
        double lat = latitude == null ? DEFAULT_LATITUDE : latitude;
        double lon = longitude == null ? DEFAULT_LONGITUDE : longitude;
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            throw new IllegalArgumentException("위도는 -90~90, 경도는 -180~180 범위여야 합니다.");
        }
        String key = String.format("%.2f,%.2f", lat, lon);
        Instant now = clock.instant();
        Cached cached = cache.get(key);
        if (cached != null && cached.fetchedAt().plus(CACHE_TTL).isAfter(now)) {
            return cached.report();
        }
        WeatherReport report = toReport(client.forecast(lat, lon), now);
        cache.put(key, new Cached(report, now));
        return report;
    }

    WeatherReport toReport(OpenMeteoResponse r, Instant now) {
        LocalDateTime nowLocal = LocalDateTime.ofInstant(now, ClockConfig.ZONE);
        List<WeatherReport.Hourly> hourly = hourly(r.hourly(), nowLocal);
        int currentPrecip = hourly.isEmpty() ? 0 : hourly.getFirst().precipitationProbability();
        OpenMeteoResponse.Current c = r.current();
        WeatherReport.Current current = new WeatherReport.Current(
                LocalDateTime.parse(c.time()).atOffset(OFFSET),
                nz(c.temperature()),
                nz(c.apparentTemperature()),
                currentPrecip,
                nz(c.windSpeed()),
                WeatherCondition.fromWmo(c.weatherCode()));
        return new WeatherReport(r.latitude(), r.longitude(), current, hourly, daily(r.daily()));
    }

    private List<WeatherReport.Hourly> hourly(OpenMeteoResponse.Hourly h, LocalDateTime nowLocal) {
        List<WeatherReport.Hourly> result = new ArrayList<>();
        if (h == null || h.time() == null) {
            return result;
        }
        LocalDateTime currentHour = nowLocal.withMinute(0).withSecond(0).withNano(0);
        for (int i = 0; i < h.time().size() && result.size() < HOURS; i++) {
            LocalDateTime time = LocalDateTime.parse(h.time().get(i));
            if (time.isBefore(currentHour)) {
                continue;
            }
            result.add(new WeatherReport.Hourly(
                    OffsetDateTime.of(time, OFFSET),
                    nz(at(h.temperature(), i)),
                    nz(at(h.apparentTemperature(), i)),
                    nzInt(at(h.precipitationProbability(), i)),
                    WeatherCondition.fromWmo(at(h.weatherCode(), i))));
        }
        return result;
    }

    private List<DailyWeather> daily(OpenMeteoResponse.Daily d) {
        List<DailyWeather> result = new ArrayList<>();
        for (int i = 0; i < d.time().size(); i++) {
            result.add(new DailyWeather(
                    LocalDate.parse(d.time().get(i)),
                    WeatherCondition.fromWmo(at(d.weatherCode(), i)),
                    nz(at(d.temperatureMin(), i)),
                    nz(at(d.temperatureMax(), i)),
                    nz(at(d.apparentMin(), i)),
                    nz(at(d.apparentMax(), i)),
                    nzInt(at(d.precipitationProbabilityMax(), i))));
        }
        return result;
    }

    private static <T> T at(List<T> list, int i) {
        return list == null || i >= list.size() ? null : list.get(i);
    }

    private static double nz(Double v) {
        return v == null ? 0.0 : v;
    }

    private static int nzInt(Integer v) {
        return v == null ? 0 : v;
    }

    private record Cached(WeatherReport report, Instant fetchedAt) {
    }
}
