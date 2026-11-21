package com.weekfit.schedule;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {

    List<CalendarEvent> findByUserIdAndStartsAtGreaterThanEqualAndStartsAtLessThanOrderByStartsAtAsc(
            UUID userId, Instant from, Instant toExclusive);

    Optional<CalendarEvent> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByUserIdAndStartsAtGreaterThanEqualAndStartsAtLessThan(UUID userId, Instant from, Instant toExclusive);
}
