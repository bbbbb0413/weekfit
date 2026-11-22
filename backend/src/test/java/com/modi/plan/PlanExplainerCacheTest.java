package com.modi.plan;

import static com.modi.plan.PlanFixtures.weather;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.function.Consumer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;

class PlanExplainerCacheTest {

    private static final LocalDate DAY = LocalDate.of(2026, 11, 23);

    private final ChatClient chatClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);
    private final MutableClock clock = new MutableClock(Instant.parse("2026-11-22T00:00:00Z"));
    private PlanExplainer explainer;

    @BeforeEach
    void setUp() {
        explainer = new PlanExplainer(chatClient, new ByteArrayResource("system".getBytes()), clock);
    }

    @Test
    void sameInputCallsAiOnce() {
        answer("AI가 쓴 설명");

        PlanExplainer.Explanations first = explainer.explain(List.of(day(5)), List.of());
        PlanExplainer.Explanations second = explainer.explain(List.of(day(5)), List.of());

        verify(chatClient, times(1)).prompt();
        assertThat(second.aiAvailable()).isTrue();
        assertThat(second.byDate().get(DAY).reason()).isEqualTo("AI가 쓴 설명");
        assertThat(second.byDate()).isEqualTo(first.byDate());
    }

    @Test
    void changedInputCallsAiAgain() {
        answer("AI가 쓴 설명");

        explainer.explain(List.of(day(5)), List.of());
        explainer.explain(List.of(day(-3)), List.of());

        verify(chatClient, times(2)).prompt();
    }

    @Test
    void expiredEntryCallsAiAgain() {
        answer("AI가 쓴 설명");

        explainer.explain(List.of(day(5)), List.of());
        clock.advance(PlanExplainer.CACHE_TTL.plusMinutes(1));
        explainer.explain(List.of(day(5)), List.of());

        verify(chatClient, times(2)).prompt();
    }

    @Test
    void failureIsNotCached() {
        answer(null);
        PlanExplainer.Explanations failed = explainer.explain(List.of(day(5)), List.of());
        answer("AI가 쓴 설명");
        PlanExplainer.Explanations retried = explainer.explain(List.of(day(5)), List.of());

        assertThat(failed.aiAvailable()).isFalse();
        assertThat(retried.aiAvailable()).isTrue();
        verify(chatClient, times(1)).prompt();
    }

    @SuppressWarnings("unchecked")
    private void answer(String reason) {
        PlanExplainer.AiDays days = reason == null ? null
                : new PlanExplainer.AiDays(List.of(new PlanExplainer.AiDay(DAY.toString(), reason, null)));
        when(chatClient.prompt().system(any(Resource.class)).user(any(Consumer.class)).call()
                .entity(PlanExplainer.AiDays.class)).thenReturn(days);
        clearInvocations(chatClient);
    }

    private static WeeklyPlanner.DayResult day(double apparentMin) {
        DayContext ctx = DayContext.of(DAY, List.of(), weather(DAY, apparentMin, apparentMin + 6), 0, null);
        return new WeeklyPlanner.DayResult(ctx, null, List.of());
    }

    private static final class MutableClock extends Clock {
        private Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
