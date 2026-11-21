package com.weekfit.schedule;

import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 일정 제목·장소에서 개인정보로 볼 만한 부분을 가린다. 외부 AI 로는 마스킹 결과만 보낸다.
 * 이름은 형태소 분석 없이 패턴으로 추정하므로 놓치거나 과하게 가릴 수 있다. 직함·관계어는 일정 성격을
 * 판단하는 단서라서 가리지 않는다.
 */
public final class PiiMasker {

    public record Result(String text, int maskedCount) {
    }

    private static final Set<String> KEEP_WORDS = Set.of(
            "팀장", "부장", "과장", "차장", "대리", "주임", "사원", "사장", "대표", "이사", "실장", "원장", "교수",
            "선생", "선배", "후배", "고객", "손님", "친구", "동기", "동료", "팀원", "가족", "부모", "엄마", "아빠",
            "어머", "아버", "할머", "할아버", "언니", "오빠", "누나", "동생", "회사", "학교", "동아리", "회식",
            "팀", "고객사", "거래처", "남친", "여친", "남자친구", "여자친구", "사촌", "조카", "삼촌", "이모", "고모");

    private static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+");
    private static final Pattern URL = Pattern.compile("https?://\\S+");
    private static final Pattern RRN = Pattern.compile("\\d{6}-[1-4]\\d{6}");
    private static final Pattern PHONE = Pattern.compile("(01[016789]|0\\d{1,2})[-. ]?\\d{3,4}[-. ]?\\d{4}");
    private static final Pattern ADDRESS_NUMBER = Pattern.compile("[가-힣0-9]+(로|길)\\s?\\d+(-\\d+)?(번길)?|\\d+(-\\d+)?\\s?(번지|호)");
    private static final Pattern HONORIFIC = Pattern.compile("([가-힣]{2,4})(님|씨)");
    private static final Pattern WITH = Pattern.compile("(^|\\s)([가-힣]{2,3})(이랑|랑|하고|와|과)(?=\\s|$)");
    private static final Pattern OCCASION = Pattern.compile(
            "(^|\\s)([가-힣]{2,3})(의)?\\s?(결혼식|생일|생일파티|돌잔치|장례식|집들이|송별회|환영회|졸업식)");

    private PiiMasker() {
    }

    public static Result mask(String input) {
        if (input == null || input.isBlank()) {
            return new Result(input, 0);
        }
        int[] count = {0};
        String s = input;
        s = replace(s, EMAIL, "[이메일]", count);
        s = replace(s, URL, "[링크]", count);
        s = replace(s, RRN, "[주민번호]", count);
        s = replace(s, PHONE, "[전화번호]", count);
        s = replace(s, ADDRESS_NUMBER, "[주소]", count);
        s = replaceName(s, HONORIFIC, 1, m -> "[이름]" + m.group(2), count);
        s = replaceName(s, WITH, 2, m -> m.group(1) + "[이름]" + m.group(3), count);
        s = replaceName(s, OCCASION, 2, m -> m.group(1) + "[이름] " + m.group(4), count);
        return new Result(s, count[0]);
    }

    private static String replace(String s, Pattern p, String token, int[] count) {
        Matcher m = p.matcher(s);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            count[0]++;
            m.appendReplacement(sb, Matcher.quoteReplacement(token));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private static String replaceName(String s, Pattern p, int nameGroup,
            java.util.function.Function<Matcher, String> replacement, int[] count) {
        Matcher m = p.matcher(s);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String candidate = m.group(nameGroup);
            if (isKeepWord(candidate)) {
                m.appendReplacement(sb, Matcher.quoteReplacement(m.group()));
                continue;
            }
            count[0]++;
            m.appendReplacement(sb, Matcher.quoteReplacement(replacement.apply(m)));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private static boolean isKeepWord(String word) {
        for (String keep : KEEP_WORDS) {
            if (word.equals(keep) || word.endsWith(keep)) {
                return true;
            }
        }
        return false;
    }
}
