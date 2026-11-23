package com.modi.ai;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AiUsageTrackerTest {

    @Test
    void sumsCallsAndTokensByFeature() {
        AiUsageTracker tracker = new AiUsageTracker();
        tracker.record("AvatarPaintService", "claude", 1000, 200, 5000, true);
        tracker.record("AvatarPaintService", "claude", 500, 100, 3000, true);
        tracker.record("PlanExplainer", "claude", 0, 0, 100, false);

        AiUsageTracker.Report report = tracker.report();

        assertThat(report.total().calls()).isEqualTo(3);
        assertThat(report.total().inputTokens()).isEqualTo(1500);
        assertThat(report.byFeature().get("AvatarPaintService").outputTokens()).isEqualTo(300);
        assertThat(report.byFeature().get("PlanExplainer").failures()).isEqualTo(1);
        assertThat(report.recent()).hasSize(3);
    }
}
