package com.modi.closet;

import com.modi.ai.Vocabulary;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "clothing_item")
public class ClothingItem {

    @Id
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    private String name;

    private String imageKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    private String subType;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "text[]")
    private List<String> colors;

    @Column(nullable = false)
    private int warmth;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "text[]")
    private List<String> styles;

    @Column(nullable = false)
    private int formality;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ItemStatus status;

    @Column(nullable = false)
    private int wearsSinceWash;

    @Column(nullable = false)
    private int washThreshold;

    private Instant dryUntil;

    private LocalDate lastWornOn;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected ClothingItem() {
    }

    public static ClothingItem create(UUID userId, ClothingSpec spec, String imageKey, Instant now) {
        ClothingItem item = new ClothingItem();
        item.id = UUID.randomUUID();
        item.userId = userId;
        item.imageKey = imageKey;
        item.status = ItemStatus.AVAILABLE;
        item.wearsSinceWash = 0;
        item.createdAt = now;
        item.apply(spec, now);
        return item;
    }

    public void update(ClothingSpec spec, Instant now) {
        apply(spec, now);
    }

    private void apply(ClothingSpec spec, Instant now) {
        List<String> normalizedColors = Vocabulary.colors(spec.colors());
        if (normalizedColors.isEmpty()) {
            throw new IllegalArgumentException("colors 는 정해진 색 목록에서 1개 이상 골라야 합니다.");
        }
        this.name = spec.name();
        this.category = spec.category();
        this.subType = spec.subType();
        this.colors = normalizedColors;
        this.warmth = spec.warmth();
        this.styles = Vocabulary.styles(spec.styles());
        this.formality = spec.formality();
        this.washThreshold = spec.washThreshold() != null ? spec.washThreshold() : spec.category().defaultWashThreshold();
        this.updatedAt = now;
    }

    /** 건조 시간이 지난 옷은 저장된 값과 관계없이 입을 수 있음으로 본다. */
    public ItemStatus effectiveStatus(Instant at) {
        if (status == ItemStatus.DRYING && dryUntil != null && !dryUntil.isAfter(at)) {
            return ItemStatus.AVAILABLE;
        }
        return status;
    }

    public boolean isWearableAt(Instant at) {
        return effectiveStatus(at) == ItemStatus.AVAILABLE;
    }

    public boolean needsWash() {
        return wearsSinceWash >= washThreshold;
    }

    public void recordWear(LocalDate date, Instant now) {
        wearsSinceWash++;
        if (lastWornOn == null || date.isAfter(lastWornOn)) {
            lastWornOn = date;
        }
        if (status == ItemStatus.DRYING && dryUntil != null && !dryUntil.isAfter(now)) {
            status = ItemStatus.AVAILABLE;
            dryUntil = null;
        }
        updatedAt = now;
    }

    /** 착용 기록 취소. lastWornOn 은 남은 기록 중 가장 최근 날짜(없으면 null)로 되돌린다. */
    public void undoWear(LocalDate previousLastWornOn, Instant now) {
        wearsSinceWash = Math.max(0, wearsSinceWash - 1);
        lastWornOn = previousLastWornOn;
        updatedAt = now;
    }

    public void startWash(Instant now, Duration dryTime) {
        status = ItemStatus.DRYING;
        dryUntil = now.plus(dryTime);
        wearsSinceWash = 0;
        updatedAt = now;
    }

    /** 사용자가 직접 바꿀 수 있는 상태는 AVAILABLE, LAUNDRY, REPAIR 뿐이다. */
    public void changeStatus(ItemStatus newStatus, Instant now) {
        if (newStatus == ItemStatus.DRYING) {
            throw new IllegalArgumentException("건조 중 상태는 세탁 시작(/api/laundry)으로만 바꿀 수 있습니다.");
        }
        status = newStatus;
        dryUntil = null;
        updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getName() { return name; }
    public String getImageKey() { return imageKey; }
    public Category getCategory() { return category; }
    public String getSubType() { return subType; }
    public List<String> getColors() { return List.copyOf(colors); }
    public int getWarmth() { return warmth; }
    public List<String> getStyles() { return List.copyOf(styles); }
    public int getFormality() { return formality; }
    public ItemStatus getStatus() { return status; }
    public int getWearsSinceWash() { return wearsSinceWash; }
    public int getWashThreshold() { return washThreshold; }
    public Instant getDryUntil() { return dryUntil; }
    public LocalDate getLastWornOn() { return lastWornOn; }
}
