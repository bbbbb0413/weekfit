package com.modi.avatar;

import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** LLM이 준 SVG에서 실행 가능한 요소와 외부 참조를 막는다. 통과하지 못하면 버린다. */
final class SvgSanitizer {

    static final int MAX_LENGTH = 30_000;
    private static final Pattern SVG = Pattern.compile("<svg[\\s\\S]*?</svg>", Pattern.CASE_INSENSITIVE);
    private static final Pattern FORBIDDEN = Pattern.compile(
            "<script|<foreignobject|<iframe|<image|<use|<a[\\s>]|<style|javascript:|\\son[a-z]+\\s*=|href\\s*=|url\\(\\s*['\"]?(?!#)",
            Pattern.CASE_INSENSITIVE);

    private SvgSanitizer() {
    }

    static Optional<String> clean(String raw) {
        if (raw == null) {
            return Optional.empty();
        }
        Matcher m = SVG.matcher(raw);
        if (!m.find()) {
            return Optional.empty();
        }
        String svg = m.group().trim();
        if (svg.length() > MAX_LENGTH || FORBIDDEN.matcher(svg).find()) {
            return Optional.empty();
        }
        if (!svg.toLowerCase(Locale.ROOT).contains("xmlns=")) {
            svg = svg.replaceFirst("(?i)<svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"");
        }
        return Optional.of(svg);
    }
}
