package com.modi.common.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClockConfig {

    /** 서비스 기준 시간대. 날짜 계산(오늘·요일·마감)은 모두 이 시간대로 한다. */
    public static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

    @Bean
    public Clock clock() {
        return Clock.system(ZONE);
    }
}
