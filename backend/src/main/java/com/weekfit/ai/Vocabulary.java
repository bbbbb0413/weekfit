package com.weekfit.ai;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** 옷 속성에 쓰는 고정 어휘. AI 출력과 사용자 입력을 모두 이 값으로 정규화한다. */
public final class Vocabulary {

    public static final List<String> COLORS = List.of(
            "블랙", "화이트", "그레이", "네이비", "블루", "베이지", "브라운", "카키",
            "그린", "레드", "핑크", "퍼플", "옐로", "오렌지", "멀티");

    public static final List<String> STYLES = List.of(
            "캐주얼", "미니멀", "포멀", "스포티", "스트릿", "빈티지", "페미닌", "아웃도어");

    /** 어떤 옷과도 잘 어울리는 무채색 계열. 색 조합 판단에 쓴다. */
    public static final Set<String> NEUTRALS = Set.of("블랙", "화이트", "그레이", "네이비", "베이지");

    private static final int MAX_VALUES = 3;

    private Vocabulary() {
    }

    public static List<String> colors(Collection<String> raw) {
        return filter(raw, COLORS);
    }

    public static List<String> styles(Collection<String> raw) {
        return filter(raw, STYLES);
    }

    private static List<String> filter(Collection<String> raw, List<String> allowed) {
        if (raw == null) {
            return List.of();
        }
        Set<String> result = new LinkedHashSet<>();
        for (String value : raw) {
            if (value != null && allowed.contains(value.trim())) {
                result.add(value.trim());
            }
            if (result.size() == MAX_VALUES) {
                break;
            }
        }
        return List.copyOf(result);
    }
}
