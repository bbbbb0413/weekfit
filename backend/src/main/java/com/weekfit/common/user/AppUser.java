package com.weekfit.common.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_user")
public class AppUser {

    public static final UUID DEMO_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    public static final String GUEST_NAME = "게스트";
    private static final int MAX_BIAS = 2;

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    /** 개인 체감 보정값. 양수면 더 따뜻하게 입혀야 하는 사용자이다. */
    @Column(nullable = false)
    private int warmthBias;

    @Column(nullable = false)
    private Instant createdAt;

    protected AppUser() {
    }

    public static AppUser guest(UUID id) {
        AppUser user = new AppUser();
        user.id = id;
        user.name = GUEST_NAME;
        user.warmthBias = 0;
        user.createdAt = Instant.now();
        return user;
    }

    /** 추웠다고 하면 다음 추천을 더 따뜻하게, 더웠다고 하면 더 가볍게 조정한다. */
    public void applyFeedback(ThermalFeedback feedback) {
        int delta = switch (feedback) {
            case COLD -> 1;
            case HOT -> -1;
            case OK -> 0;
        };
        warmthBias = Math.max(-MAX_BIAS, Math.min(MAX_BIAS, warmthBias + delta));
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public int getWarmthBias() {
        return warmthBias;
    }
}
