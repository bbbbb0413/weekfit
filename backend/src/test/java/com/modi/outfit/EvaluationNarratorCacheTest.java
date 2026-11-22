package com.modi.outfit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.modi.closet.Category;
import com.modi.closet.ItemStatus;
import com.modi.plan.DayContext;
import com.modi.plan.Garment;
import com.modi.weather.DailyWeather;
import com.modi.weather.WeatherCondition;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;

class EvaluationNarratorCacheTest {

    private static final LocalDate DAY = LocalDate.of(2026, 11, 28);
    private static final Instant WEAR = Instant.parse("2026-11-27T23:00:00Z");

    private final ChatClient chatClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);
    private final EvaluationNarrator narrator = new EvaluationNarrator(chatClient,
            new ByteArrayResource("system".getBytes()), Clock.fixed(Instant.parse("2026-11-22T00:00:00Z"), ZoneOffset.UTC));

    private final Garment shirt = garment("네이비 셔츠", Category.TOP, "네이비");
    private final Garment slacks = garment("블랙 슬랙스", Category.BOTTOM, "블랙");

    @Test
    void sameOutfitAndDayCallsAiOnce() {
        answer(new EvaluationNarrator.Narrative(90, "잘 어울려요", "단정한 조합이에요"));

        Optional<EvaluationNarrator.Narrative> first = narrate(List.of(shirt, slacks), 5);
        Optional<EvaluationNarrator.Narrative> second = narrate(List.of(shirt, slacks), 5);

        verify(chatClient, times(1)).prompt();
        assertThat(second).isEqualTo(first);
        assertThat(second.orElseThrow().summary()).isEqualTo("단정한 조합이에요");
    }

    @Test
    void differentWeatherCallsAiAgain() {
        answer(new EvaluationNarrator.Narrative(90, "잘 어울려요", "단정한 조합이에요"));

        narrate(List.of(shirt, slacks), 5);
        narrate(List.of(shirt, slacks), -5);

        verify(chatClient, times(2)).prompt();
    }

    @Test
    void emptyAnswerIsNotCached() {
        answer(null);
        assertThat(narrate(List.of(shirt, slacks), 5)).isEmpty();
        answer(new EvaluationNarrator.Narrative(80, "무난해요", "무난한 조합이에요"));

        assertThat(narrate(List.of(shirt, slacks), 5)).isPresent();
        verify(chatClient, times(1)).prompt();
    }

    private Optional<EvaluationNarrator.Narrative> narrate(List<Garment> outfit, double apparentMin) {
        DailyWeather w = new DailyWeather(DAY, WeatherCondition.CLEAR, apparentMin, apparentMin + 6, apparentMin,
                apparentMin + 6, 0);
        DayContext ctx = DayContext.of(DAY, List.of(), w, 0, null);
        OutfitRules.Result rules = OutfitRules.evaluate(outfit, ctx, outfit, WEAR);
        return narrator.narrate(outfit, ctx, rules);
    }

    @SuppressWarnings("unchecked")
    private void answer(EvaluationNarrator.Narrative narrative) {
        when(chatClient.prompt().system(any(Resource.class)).user(any(Consumer.class)).call()
                .entity(EvaluationNarrator.Narrative.class)).thenReturn(narrative);
        clearInvocations(chatClient);
    }

    private static Garment garment(String name, Category c, String color) {
        return new Garment(UUID.nameUUIDFromBytes(name.getBytes()), name, c, List.of(color), 2, List.of("포멀"), 4, 2, 0,
                ItemStatus.AVAILABLE, null);
    }
}
