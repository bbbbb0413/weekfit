package com.weekfit.storage;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Iterator;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import org.springframework.stereotype.Component;

/**
 * 업로드 이미지를 JPEG 으로 다시 인코딩한다.
 * - 긴 변을 MAX_SIDE 이하로 줄여 LLM 이미지 입력 한도와 저장 용량을 맞춘다.
 * - 다시 인코딩하면서 EXIF(촬영 위치 등) 메타데이터가 제거된다.
 */
@Component
public class ImageNormalizer {

    static final int MAX_SIDE = 1568;
    private static final float JPEG_QUALITY = 0.85f;

    public byte[] normalize(byte[] original) {
        BufferedImage source = read(original);
        BufferedImage resized = resizeToRgb(source);
        return writeJpeg(resized);
    }

    private BufferedImage read(byte[] original) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(original));
            if (image == null) {
                throw new IllegalArgumentException("JPEG 또는 PNG 이미지만 올릴 수 있습니다.");
            }
            return image;
        } catch (IOException e) {
            throw new IllegalArgumentException("이미지를 읽을 수 없습니다.", e);
        }
    }

    private BufferedImage resizeToRgb(BufferedImage source) {
        int longest = Math.max(source.getWidth(), source.getHeight());
        double scale = longest > MAX_SIDE ? (double) MAX_SIDE / longest : 1.0;
        int width = Math.max(1, (int) Math.round(source.getWidth() * scale));
        int height = Math.max(1, (int) Math.round(source.getHeight() * scale));

        BufferedImage target = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = target.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, width, height);
            g.drawImage(source, 0, 0, width, height, null);
        } finally {
            g.dispose();
        }
        return target;
    }

    private byte[] writeJpeg(BufferedImage image) {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
        ImageWriter writer = writers.next();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(ios);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
            writer.write(null, new IIOImage(image, null, null), param);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }
}
