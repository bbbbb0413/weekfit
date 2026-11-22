package com.modi.shopping.find;

import java.util.ArrayList;
import java.util.List;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.ai.converter.StructuredOutputConverter;

/**
 * 웹 검색을 쓰면 모델이 JSON 앞뒤에 설명 문장을 붙이는 경우가 있다(실측 2회 중 1회).
 * 먼저 그대로 변환해 보고, 실패하면 본문에서 JSON 객체 후보를 뒤에서부터 꺼내 다시 변환한다.
 */
final class LenientFindConverter implements StructuredOutputConverter<FindAiResult> {

    private final BeanOutputConverter<FindAiResult> delegate = new BeanOutputConverter<>(FindAiResult.class);

    @Override
    public String getFormat() {
        return delegate.getFormat();
    }

    @Override
    public String getJsonSchema() {
        return delegate.getJsonSchema();
    }

    @Override
    public FindAiResult convert(String text) {
        RuntimeException first;
        try {
            return delegate.convert(text);
        } catch (RuntimeException e) {
            first = e;
        }
        List<String> candidates = jsonObjects(text);
        for (int i = candidates.size() - 1; i >= 0; i--) {
            try {
                return delegate.convert(candidates.get(i));
            } catch (RuntimeException ignored) {
                // 다음 후보를 시도한다
            }
        }
        throw first;
    }

    /** 문자열 안의 중괄호는 무시하면서 최상위 JSON 객체 구간을 모두 찾는다. */
    static List<String> jsonObjects(String text) {
        List<String> out = new ArrayList<>();
        if (text == null) {
            return out;
        }
        int depth = 0;
        int start = -1;
        boolean inString = false;
        boolean escaped = false;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == '"') {
                    inString = false;
                }
                continue;
            }
            if (c == '"' && depth > 0) {
                inString = true;
            } else if (c == '{') {
                if (depth++ == 0) {
                    start = i;
                }
            } else if (c == '}' && depth > 0 && --depth == 0) {
                out.add(text.substring(start, i + 1));
            }
        }
        return out;
    }
}
