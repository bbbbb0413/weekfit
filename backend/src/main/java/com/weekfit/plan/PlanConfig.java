package com.weekfit.plan;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PlanConfig {

    @Bean
    public OutfitSelector outfitSelector() {
        return new OutfitSelector();
    }

    @Bean
    public WeeklyPlanner weeklyPlanner(OutfitSelector selector) {
        return new WeeklyPlanner(selector);
    }
}
