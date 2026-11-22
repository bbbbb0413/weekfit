package com.modi.schedule;

import java.time.Clock;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionOperations;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 직접 추가한 일정을 규칙 분석으로 먼저 저장한 뒤, AI 분석을 백그라운드에서 돌려 덮어쓴다.
 * 저장 응답이 AI 를 기다리지 않게 하려는 것이다. 분석 중인 일정은 주간 계획이 설명 생성을 미루는 데 쓴다.
 */
@Component
public class EventAnalysisWorker {

    private static final Logger log = LoggerFactory.getLogger(EventAnalysisWorker.class);

    private final EventAnalyzer analyzer;
    private final CalendarEventRepository repository;
    private final TransactionOperations tx;
    private final Clock clock;
    private final Executor background;
    private final Set<UUID> pending = ConcurrentHashMap.newKeySet();

    @Autowired
    public EventAnalysisWorker(EventAnalyzer analyzer, CalendarEventRepository repository,
            PlatformTransactionManager transactionManager, Clock clock) {
        this(analyzer, repository, new TransactionTemplate(transactionManager), clock,
                Executors.newVirtualThreadPerTaskExecutor());
    }

    EventAnalysisWorker(EventAnalyzer analyzer, CalendarEventRepository repository, TransactionOperations tx,
            Clock clock, Executor background) {
        this.analyzer = analyzer;
        this.repository = repository;
        this.tx = tx;
        this.clock = clock;
        this.background = background;
    }

    /** 저장 트랜잭션이 커밋된 뒤 분석을 시작한다. 커밋 전에 돌면 아직 없는 일정을 찾게 되기 때문이다. */
    public void analyzeAfterCommit(UUID eventId, EventAnalyzer.Input input) {
        pending.add(eventId);
        Runnable start = () -> background.execute(() -> analyze(eventId, input));
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            start.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                start.run();
            }

            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    pending.remove(eventId);
                }
            }
        });
    }

    public boolean anyPending(Collection<UUID> eventIds) {
        return !pending.isEmpty() && eventIds.stream().anyMatch(pending::contains);
    }

    private void analyze(UUID eventId, EventAnalyzer.Input input) {
        try {
            EventAnalysis analysis = analyzer.analyze(List.of(input)).getFirst();
            if (analysis.source() != AnalysisSource.AI) {
                return; // AI 가 실패하면 이미 저장한 규칙 분석을 그대로 둔다
            }
            tx.executeWithoutResult(status -> repository.findById(eventId)
                    .filter(e -> !e.contentDiffers(input.maskedTitle(), input.maskedLocation(),
                            input.startsAt().toInstant(), input.endsAt().toInstant()))
                    .ifPresent(e -> e.applyAnalysis(analysis, clock.instant())));
        } catch (RuntimeException e) {
            log.warn("Background event analysis failed for {}, keeping rules: {}", eventId, e.toString());
        } finally {
            pending.remove(eventId);
        }
    }
}
