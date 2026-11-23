package com.modi.avatar;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SvgSanitizerTest {

    @Test
    void keepsPlainSvgAndStripsSurroundingText() {
        String raw = "그렸어요\n<svg viewBox=\"0 0 366 378\"><rect x=\"0\" y=\"0\" width=\"10\" height=\"10\" fill=\"url(#p)\"/></svg>\n끝";
        assertThat(SvgSanitizer.clean(raw)).hasValueSatisfying(svg -> {
            assertThat(svg).startsWith("<svg xmlns=\"http://www.w3.org/2000/svg\"");
            assertThat(svg).endsWith("</svg>");
        });
    }

    @Test
    void rejectsScriptsEventsAndExternalReferences() {
        assertThat(SvgSanitizer.clean("<svg><script>alert(1)</script></svg>")).isEmpty();
        assertThat(SvgSanitizer.clean("<svg><rect onload=\"x()\"/></svg>")).isEmpty();
        assertThat(SvgSanitizer.clean("<svg><image href=\"https://x\"/></svg>")).isEmpty();
        assertThat(SvgSanitizer.clean("<svg><rect fill=\"url(https://x)\"/></svg>")).isEmpty();
        assertThat(SvgSanitizer.clean("no svg here")).isEmpty();
    }
}
