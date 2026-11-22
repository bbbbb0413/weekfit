package com.modi.wear;

import com.modi.common.user.ThermalFeedback;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "wear_log")
public class WearLog {

    @Id
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private LocalDate wornOn;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "uuid[]")
    private List<UUID> itemIds;

    @Enumerated(EnumType.STRING)
    private ThermalFeedback feedback;

    @Column(nullable = false)
    private Instant createdAt;

    protected WearLog() {
    }

    public static WearLog of(UUID userId, LocalDate wornOn, List<UUID> itemIds, ThermalFeedback feedback, Instant now) {
        WearLog log = new WearLog();
        log.id = UUID.randomUUID();
        log.userId = userId;
        log.wornOn = wornOn;
        log.itemIds = List.copyOf(itemIds);
        log.feedback = feedback;
        log.createdAt = now;
        return log;
    }

    public UUID getId() { return id; }
    public LocalDate getWornOn() { return wornOn; }
    public List<UUID> getItemIds() { return List.copyOf(itemIds); }
    public ThermalFeedback getFeedback() { return feedback; }
}
