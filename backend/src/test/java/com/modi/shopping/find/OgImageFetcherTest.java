package com.modi.shopping.find;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class OgImageFetcherTest {

    @Test
    void extractsOgImageRegardlessOfAttributeOrder() {
        String html = "<head><meta content=\"https://img.example.com/a.jpg?x=1&amp;y=2\" property=\"og:image\"></head>";

        assertThat(OgImageFetcher.extract(html)).isEqualTo("https://img.example.com/a.jpg?x=1&y=2");
    }

    @Test
    void upgradesProtocolRelativeUrl() {
        assertThat(OgImageFetcher.extract("<meta property='og:image' content='//img.example.com/a.jpg'>"))
                .isEqualTo("https://img.example.com/a.jpg");
    }

    @Test
    void rejectsNonHttpsAndMissingTag() {
        assertThat(OgImageFetcher.extract("<meta property=\"og:image\" content=\"http://img.example.com/a.jpg\">")).isNull();
        assertThat(OgImageFetcher.extract("<meta property=\"og:title\" content=\"x\">")).isNull();
    }

    @Test
    void fetchRefusesDisallowedHostWithoutNetwork() {
        assertThat(new OgImageFetcher().fetch("https://169.254.169.254/latest/meta-data")).isNull();
    }
}
