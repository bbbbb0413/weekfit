package com.modi.shopping.find;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 상품 페이지의 og:image 를 읽는다. 허용 도메인만 요청하고 리다이렉트를 따라가지 않는다(내부망 요청 방지).
 * 실패하면 null 이며 화면은 이미지 없이 카드를 그린다. 무신사는 서버 요청을 403 으로 막아 대부분 null 이다.
 */
@Component
public class OgImageFetcher {

    private static final Logger log = LoggerFactory.getLogger(OgImageFetcher.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(3);
    private static final int MAX_BYTES = 512 * 1024;
    private static final String USER_AGENT =
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
    private static final Pattern META = Pattern.compile("<meta\\b[^>]*>", Pattern.CASE_INSENSITIVE);
    private static final Pattern OG_IMAGE = Pattern.compile("(property|name)\\s*=\\s*[\"']og:image(:secure_url)?[\"']",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern CONTENT = Pattern.compile("content\\s*=\\s*[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    public String fetch(String pageUrl) {
        if (!AllowedMalls.isAllowed(pageUrl)) {
            return null;
        }
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(pageUrl.strip()))
                    .timeout(TIMEOUT)
                    .header("User-Agent", USER_AGENT)
                    .header("Accept-Language", "ko-KR,ko;q=0.9")
                    .GET().build();
            HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
            try (InputStream body = response.body()) {
                if (response.statusCode() != 200) {
                    log.debug("og:image fetch {} -> {}", pageUrl, response.statusCode());
                    return null;
                }
                return extract(new String(body.readNBytes(MAX_BYTES), StandardCharsets.UTF_8));
            }
        } catch (IOException | IllegalArgumentException e) {
            log.debug("og:image fetch failed {}: {}", pageUrl, e.toString());
            return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        }
    }

    /** meta 태그 속성 순서와 관계없이 og:image 의 content 를 찾는다. https 주소만 돌려준다. */
    static String extract(String html) {
        Matcher meta = META.matcher(html);
        while (meta.find()) {
            String tag = meta.group();
            if (!OG_IMAGE.matcher(tag).find()) {
                continue;
            }
            Matcher content = CONTENT.matcher(tag);
            if (content.find()) {
                String url = content.group(1).replace("&amp;", "&").strip();
                if (url.startsWith("//")) {
                    url = "https:" + url;
                }
                return url.startsWith("https://") ? url : null;
            }
        }
        return null;
    }
}
