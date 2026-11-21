package com.weekfit.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

class ImageNormalizerTest {

    private final ImageNormalizer normalizer = new ImageNormalizer();

    @Test
    void downscalesLargePngToJpeg() throws Exception {
        BufferedImage big = new BufferedImage(4000, 2000, BufferedImage.TYPE_INT_ARGB);
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        ImageIO.write(big, "png", png);

        byte[] jpeg = normalizer.normalize(png.toByteArray());
        BufferedImage result = ImageIO.read(new ByteArrayInputStream(jpeg));

        assertThat(jpeg[0]).isEqualTo((byte) 0xFF);
        assertThat(jpeg[1]).isEqualTo((byte) 0xD8);
        assertThat(result.getWidth()).isEqualTo(ImageNormalizer.MAX_SIDE);
        assertThat(result.getHeight()).isEqualTo(784);
    }

    @Test
    void rejectsNonImage() {
        assertThatThrownBy(() -> normalizer.normalize("not an image".getBytes()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void validatesStorageKeys() {
        assertThat(StorageService.isValidKey("3f6c1a2b.jpg")).isTrue();
        assertThat(StorageService.isValidKey("navy-shirt.jpg")).isTrue();
        assertThat(StorageService.isValidKey("../etc/passwd")).isFalse();
        assertThat(StorageService.isValidKey("a..b")).isFalse();
        assertThat(StorageService.isValidKey(".seeded")).isFalse();
    }
}
