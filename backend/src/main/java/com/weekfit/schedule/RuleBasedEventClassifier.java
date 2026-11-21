package com.weekfit.schedule;

import java.util.List;
import java.util.regex.Pattern;

/** AI 를 쓸 수 없을 때의 키워드 분류. 순서대로 처음 맞는 규칙을 쓴다. */
public final class RuleBasedEventClassifier {

    private static final double MATCHED_CONFIDENCE = 0.6;
    private static final double DEFAULT_CONFIDENCE = 0.3;

    private record Rule(Pattern pattern, Tpo tpo, int formality, int importance, String dressCode,
            List<String> avoidColors, Boolean indoor, ActivityLevel activity) {
    }

    private static final List<Rule> RULES = List.of(
            rule("장례|조문|빈소", Tpo.FORMAL, 5, 5, "검정 계열 정장", List.of("레드", "핑크", "옐로", "오렌지", "멀티", "화이트"), true, ActivityLevel.LOW),
            rule("결혼식|웨딩|예식", Tpo.FORMAL, 4, 5, "하객 세미정장", List.of("화이트"), true, ActivityLevel.LOW),
            rule("면접|인터뷰|상견례", Tpo.FORMAL, 5, 5, "정장 또는 비즈니스 포멀", List.of("멀티"), true, ActivityLevel.LOW),
            rule("발표|프레젠테이션|시상식|컨퍼런스|학회", Tpo.FORMAL, 4, 4, "비즈니스 캐주얼 이상", List.of(), true, ActivityLevel.LOW),
            rule("소개팅|데이트|기념일|디너|레스토랑", Tpo.DATE, 3, 4, "깔끔한 캐주얼", List.of(), true, ActivityLevel.LOW),
            rule("등산|트레킹|하이킹|[가-힣]+산(\\s|$)", Tpo.OUTDOOR, 1, 3, "기능성 아웃도어", List.of(), false, ActivityLevel.HIGH),
            rule("캠핑|피크닉|나들이|페스티벌|축제|공원|여행", Tpo.OUTDOOR, 2, 3, "활동하기 편한 캐주얼", List.of(), false, ActivityLevel.MEDIUM),
            rule("헬스|운동|요가|필라테스|러닝|조깅|축구|농구|풋살|수영|클라이밍|볼링|테니스|배드민턴", Tpo.EXERCISE, 1, 2, "운동복", List.of(), null, ActivityLevel.HIGH),
            rule("고객|클라이언트|거래처|외부\\s?미팅", Tpo.WORK, 4, 3, "비즈니스 캐주얼", List.of(), true, ActivityLevel.LOW),
            rule("회식|워크샵|워크숍", Tpo.WORK, 3, 2, "편한 비즈니스 캐주얼", List.of(), true, ActivityLevel.MEDIUM),
            rule("회의|미팅|출근|근무|업무|세미나|교육|스터디", Tpo.WORK, 4, 2, "비즈니스 캐주얼", List.of(), true, ActivityLevel.LOW));

    private RuleBasedEventClassifier() {
    }

    public static EventAnalysis classify(String maskedTitle, String maskedLocation) {
        String text = (maskedTitle == null ? "" : maskedTitle) + " " + (maskedLocation == null ? "" : maskedLocation);
        for (Rule r : RULES) {
            if (r.pattern().matcher(text).find()) {
                return new EventAnalysis(r.tpo(), r.formality(), r.dressCode(), r.avoidColors(), r.indoor(),
                        r.activity(), r.importance(), MATCHED_CONFIDENCE, AnalysisSource.RULE, null);
            }
        }
        String question = "'" + (maskedTitle == null ? "" : maskedTitle.strip()) + "'은(는) 어떤 자리인가요?";
        return new EventAnalysis(Tpo.DAILY, Tpo.DAILY.defaultFormality(), null, List.of(), null,
                ActivityLevel.LOW, Tpo.DAILY.defaultImportance(), DEFAULT_CONFIDENCE, AnalysisSource.RULE, question);
    }

    private static Rule rule(String regex, Tpo tpo, int formality, int importance, String dressCode,
            List<String> avoid, Boolean indoor, ActivityLevel activity) {
        return new Rule(Pattern.compile(regex), tpo, formality, importance, dressCode, avoid, indoor, activity);
    }
}
