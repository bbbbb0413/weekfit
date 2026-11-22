package com.modi.schedule;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class RuleBasedEventClassifierTest {

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "[이름] 결혼식|FORMAL", "삼성전자 면접|FORMAL", "소개팅|DATE", "북한산 등산|OUTDOOR",
            "필라테스|EXERCISE", "고객사 미팅|WORK", "팀 회식|WORK", "주간회의|WORK", "치과|DAILY"})
    void classifiesByKeyword(String title, Tpo expected) {
        assertThat(RuleBasedEventClassifier.classify(title, null).tpo()).isEqualTo(expected);
    }

    @Test
    void weddingAvoidsWhite() {
        EventAnalysis a = RuleBasedEventClassifier.classify("[이름] 결혼식", "웨딩홀");

        assertThat(a.avoidColors()).containsExactly("화이트");
        assertThat(a.importance()).isEqualTo(5);
        assertThat(a.source()).isEqualTo(AnalysisSource.RULE);
    }

    @Test
    void unknownEventAsksClarifyingQuestion() {
        EventAnalysis a = RuleBasedEventClassifier.classify("치과", null);

        assertThat(a.confidence()).isLessThan(0.5);
        assertThat(a.clarifyQuestion()).contains("치과");
    }
}
