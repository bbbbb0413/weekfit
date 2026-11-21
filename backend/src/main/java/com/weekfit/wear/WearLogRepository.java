package com.weekfit.wear;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WearLogRepository extends JpaRepository<WearLog, UUID> {

    List<WearLog> findByUserIdAndWornOnBetweenOrderByWornOnAsc(UUID userId, LocalDate from, LocalDate to);
}
