package com.modi.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionOperations;

class EventAnalysisWorkerTest {

    private static final Instant NOW = Instant.parse("2026-11-22T00:00:00Z");
    private static final OffsetDateTime START = OffsetDateTime.parse("2026-11-25T19:00:00+09:00");
    private static final EventAnalyzer.Input INPUT = new EventAnalyzer.Input("저녁 약속", null, START, START.plusHours(2));
    private static final EventAnalysis AI = new EventAnalysis(Tpo.DATE, 3, "깔끔한 캐주얼", List.of(), true,
            ActivityLevel.LOW, 4, 0.9, AnalysisSource.AI, null);

    private final EventAnalyzer analyzer = mock(EventAnalyzer.class);
    private final CalendarEventRepository repository = mock(CalendarEventRepository.class);
    private final List<Runnable> queued = new ArrayList<>();
    private final EventAnalysisWorker worker = new EventAnalysisWorker(analyzer, repository,
            TransactionOperations.withoutTransaction(), Clock.fixed(NOW, ZoneOffset.UTC), queued::add);

    private final CalendarEvent event = CalendarEvent.create(UUID.randomUUID(), null, "저녁 약속", null,
            START.toInstant(), START.plusHours(2).toInstant(),
            RuleBasedEventClassifier.classify("저녁 약속", null), NOW);

    @Test
    void appliesAiAnalysisAndClearsPending() {
        when(analyzer.analyze(anyList())).thenReturn(List.of(AI));
        when(repository.findById(event.getId())).thenReturn(Optional.of(event));

        worker.analyzeAfterCommit(event.getId(), INPUT);
        assertThat(worker.anyPending(List.of(event.getId()))).isTrue();
        queued.forEach(Runnable::run);

        assertThat(event.analysis().source()).isEqualTo(AnalysisSource.AI);
        assertThat(event.analysis().tpo()).isEqualTo(Tpo.DATE);
        assertThat(worker.anyPending(List.of(event.getId()))).isFalse();
    }

    @Test
    void keepsRulesWhenAiFails() {
        when(analyzer.analyze(anyList())).thenReturn(List.of(RuleBasedEventClassifier.classify("저녁 약속", null)));

        worker.analyzeAfterCommit(event.getId(), INPUT);
        queued.forEach(Runnable::run);

        verify(repository, never()).findById(any());
        assertThat(event.analysis().source()).isEqualTo(AnalysisSource.RULE);
        assertThat(worker.anyPending(List.of(event.getId()))).isFalse();
    }

    @Test
    void clearsPendingWhenAnalyzerThrows() {
        when(analyzer.analyze(anyList())).thenThrow(new IllegalStateException("boom"));

        worker.analyzeAfterCommit(event.getId(), INPUT);
        queued.forEach(Runnable::run);

        assertThat(worker.anyPending(List.of(event.getId()))).isFalse();
    }

    @Test
    void skipsEventDeletedBeforeAnalysisFinished() {
        when(analyzer.analyze(anyList())).thenReturn(List.of(AI));
        when(repository.findById(event.getId())).thenReturn(Optional.empty());

        worker.analyzeAfterCommit(event.getId(), INPUT);
        queued.forEach(Runnable::run);

        assertThat(event.analysis().source()).isEqualTo(AnalysisSource.RULE);
    }
}
