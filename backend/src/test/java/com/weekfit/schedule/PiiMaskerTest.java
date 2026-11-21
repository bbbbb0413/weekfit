package com.weekfit.schedule;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class PiiMaskerTest {

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "민지 결혼식|[이름] 결혼식",
            "김민지님 생일파티|[이름]님 생일파티",
            "지수랑 저녁|[이름]랑 저녁",
            "팀장님 저녁 식사|팀장님 저녁 식사",
            "친구랑 영화|친구랑 영화",
            "회사 송별회|회사 송별회",
            "치과 010-1234-5678|치과 [전화번호]",
            "자료 공유 a.b@test.com|자료 공유 [이메일]",
            "면접 https://meet.example.com/abc|면접 [링크]",
            "테헤란로 123 미팅|[주소] 미팅",
            "북한산 등산|북한산 등산"})
    void masksPersonalData(String input, String expected) {
        assertThat(PiiMasker.mask(input).text()).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {"민지 결혼식 010-1234-5678|2", "팀 주간회의|0"})
    void countsMaskedItems(String input, int count) {
        assertThat(PiiMasker.mask(input).maskedCount()).isEqualTo(count);
    }
}
