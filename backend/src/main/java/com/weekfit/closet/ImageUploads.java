package com.weekfit.closet;

import java.io.IOException;
import java.util.Set;
import org.springframework.web.multipart.MultipartFile;

/** multipart 이미지 업로드 공통 검증. */
public final class ImageUploads {

    private static final Set<String> ALLOWED = Set.of("image/jpeg", "image/png");

    private ImageUploads() {
    }

    public static byte[] bytesOf(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("image 파일이 비어 있습니다.");
        }
        String type = file.getContentType();
        if (type == null || !ALLOWED.contains(type.toLowerCase())) {
            throw new IllegalArgumentException("JPEG 또는 PNG 이미지만 올릴 수 있습니다.");
        }
        return file.getBytes();
    }
}
