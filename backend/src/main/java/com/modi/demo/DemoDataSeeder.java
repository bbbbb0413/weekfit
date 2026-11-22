package com.modi.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/** 심사위원이 바로 체험할 수 있도록 데모 사용자의 옷장과 이번 주 일정을 채운다. 이미 있으면 건너뛴다. */
@Component
public class DemoDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final DemoClosetSeed closetSeed;
    private final DemoEventSeed eventSeed;
    private final boolean enabled;

    public DemoDataSeeder(DemoClosetSeed closetSeed, DemoEventSeed eventSeed,
            @Value("${modi.demo.seed:true}") boolean enabled) {
        this.closetSeed = closetSeed;
        this.eventSeed = eventSeed;
        this.enabled = enabled;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seed() {
        if (!enabled) {
            return;
        }
        try {
            int created = closetSeed.seedIfEmpty();
            if (created > 0) {
                log.info("Seeded demo closet with {} items", created);
            }
            int events = eventSeed.seedIfNoUpcoming();
            if (events > 0) {
                log.info("Seeded {} demo events for the coming week", events);
            }
        } catch (RuntimeException e) {
            log.warn("Demo seed skipped: {}", e.getMessage());
        }
    }
}
