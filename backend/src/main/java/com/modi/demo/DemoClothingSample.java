package com.modi.demo;

import com.modi.closet.Category;
import com.modi.closet.ClothingSuggestion;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import org.springframework.core.io.ClassPathResource;

/**
 * 옷 등록 화면에 미리 들어가 있는 예시 사진(베이지 맨투맨). 같은 사진이 올라오면 미리 받아 둔 분석값을 돌려줘
 * 심사 중 AI를 부르지 않는다. 사진은 resources/demo/new-cloth.jpg 와 frontend/public/demo/new-cloth.jpg 가 같아야 한다.
 */
public final class DemoClothingSample {

    public static final ClothingSuggestion SUGGESTION = new ClothingSuggestion(
            "베이지 고양이 자수 맨투맨", Category.TOP, "맨투맨", List.of("베이지"), 3, List.of("캐주얼"), 2, 3, 0.9, false,
            "도톰한 면 기모 소재의 라운드넥 맨투맨으로, 왼쪽 가슴에 작은 고양이 자수 포인트가 있고 소매와 밑단에 립 시보리가 들어간 레귤러 핏이다.");

    private static final byte[] PHOTO = load();

    private DemoClothingSample() {
    }

    public static boolean matches(byte[] upload) {
        return PHOTO.length > 0 && Arrays.equals(PHOTO, upload);
    }

    private static byte[] load() {
        try (InputStream in = new ClassPathResource("demo/new-cloth.jpg").getInputStream()) {
            return in.readAllBytes();
        } catch (IOException e) {
            return new byte[0];
        }
    }
}
