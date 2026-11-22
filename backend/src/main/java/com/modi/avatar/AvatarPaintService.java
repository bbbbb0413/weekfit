package com.modi.avatar;

import com.modi.closet.Category;
import com.modi.closet.ClothingItem;
import com.modi.closet.ClothingRepository;
import com.modi.common.error.NotFoundException;
import com.modi.storage.StorageService;
import com.modi.storage.StoredImage;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;

/**
 * 옷 사진과 캐릭터 기준점을 AI에 주고, 그 캐릭터가 입을 옷 한 벌을 SVG로 그려 받는다.
 * 옷 한 벌당 한 번만 그리고 저장소에 캐시한다. 옷 이름, 색, 사진이 바뀌면 다시 그린다.
 */
@Service
public class AvatarPaintService {

    private static final Logger log = LoggerFactory.getLogger(AvatarPaintService.class);
    private static final String VERSION = "v3-landmarks";

    private final ChatClient chatClient;
    private final Resource systemPrompt;
    private final ClothingRepository repository;
    private final StorageService storage;
    // 같은 옷을 동시에 여러 번 그리지 않도록 진행 중인 키를 잡아 둔다
    private final ConcurrentHashMap<String, Object> locks = new ConcurrentHashMap<>();

    public AvatarPaintService(ChatClient chatClient,
            @Value("classpath:prompts/avatar-paint.st") Resource systemPrompt,
            ClothingRepository repository, StorageService storage) {
        this.chatClient = chatClient;
        this.systemPrompt = systemPrompt;
        this.repository = repository;
        this.storage = storage;
    }

    public AvatarPaint paint(UUID userId, UUID itemId, AvatarModel model) {
        ClothingItem item = repository.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> new NotFoundException("옷을 찾을 수 없습니다."));
        if (item.getCategory() == Category.ACCESSORY) {
            return new AvatarPaint(null, false);
        }
        // 데모 옷장 옷은 미리 그려 앱에 넣어 둔 그림을 바로 씀(심사 중 AI 호출 없음)
        Optional<String> bundled = bundled(item, model);
        if (bundled.isPresent()) {
            return new AvatarPaint(bundled.get(), true);
        }
        String key = cacheKey(item, model);
        Optional<byte[]> cached = storage.find(key);
        if (cached.isPresent()) {
            return new AvatarPaint(new String(cached.get(), StandardCharsets.UTF_8), true);
        }
        Object lock = locks.computeIfAbsent(key, k -> new Object());
        synchronized (lock) {
            try {
                cached = storage.find(key);
                if (cached.isPresent()) {
                    return new AvatarPaint(new String(cached.get(), StandardCharsets.UTF_8), true);
                }
                Optional<String> svg = draw(item, model);
                svg.ifPresent(s -> storage.put(key, s.getBytes(StandardCharsets.UTF_8), "image/svg+xml"));
                return new AvatarPaint(svg.orElse(null), svg.isPresent());
            } finally {
                locks.remove(key);
            }
        }
    }

    private Optional<String> draw(ClothingItem item, AvatarModel model) {
        String brief = """
                옷: %s
                종류: %s %s
                색: %s
                캔버스: viewBox 0 0 %d %d
                캐릭터:
                %s
                """.formatted(item.getName(), item.getCategory(), item.getSubType() == null ? "" : item.getSubType(),
                String.join(", ", item.getColors()), model.width(), model.height(), model.landmarks());
        Optional<StoredImage> photo = photoOf(item);
        try {
            String content = chatClient.prompt()
                    .system(systemPrompt)
                    .user(u -> {
                        u.text(brief + (photo.isPresent() ? "\n첨부한 사진이 이 옷이다." : "\n사진이 없다. 이름과 색만 보고 그린다."));
                        photo.ifPresent(p -> u.media(MimeType.valueOf(p.contentType()), new ByteArrayResource(p.bytes())));
                    })
                    .call()
                    .content();
            Optional<String> svg = SvgSanitizer.clean(content);
            if (svg.isEmpty()) {
                log.warn("Avatar paint for {} was rejected by the sanitizer", item.getId());
            }
            return svg;
        } catch (RuntimeException e) {
            log.warn("Avatar paint by AI failed for {}: {}", item.getId(), e.toString());
            return Optional.empty();
        }
    }

    private Optional<StoredImage> photoOf(ClothingItem item) {
        if (item.getImageKey() == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(storage.get(item.getImageKey()));
        } catch (RuntimeException e) {
            return Optional.empty();
        }
    }

    /** resources/avatar-seed/{모델}-{옷 내용 해시}.svg. 옷 id 는 환경마다 달라서 이름, 종류, 색, 분류로만 찾는다. */
    static String seedName(ClothingItem item, AvatarModel model) {
        String basis = String.join("|", "seed", model.name(), item.getName(), String.valueOf(item.getSubType()),
                String.join(",", item.getColors()), item.getCategory().name());
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(basis.getBytes(StandardCharsets.UTF_8));
            return model.name().toLowerCase(java.util.Locale.ROOT) + "-" + HexFormat.of().formatHex(hash, 0, 8) + ".svg";
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Optional<String> bundled(ClothingItem item, AvatarModel model) {
        ClassPathResource file = new ClassPathResource("avatar-seed/" + seedName(item, model));
        if (!file.exists()) {
            return Optional.empty();
        }
        try (var in = file.getInputStream()) {
            return Optional.of(new String(in.readAllBytes(), StandardCharsets.UTF_8));
        } catch (java.io.IOException e) {
            return Optional.empty();
        }
    }

    private static String cacheKey(ClothingItem item, AvatarModel model) {
        String basis = String.join("|", VERSION, model.name(), item.getName(), String.valueOf(item.getSubType()),
                String.join(",", item.getColors()), String.valueOf(item.getImageKey()), item.getCategory().name());
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(basis.getBytes(StandardCharsets.UTF_8));
            return "avatar-" + model.name().toLowerCase(java.util.Locale.ROOT) + "-" + item.getId() + "-" + HexFormat.of().formatHex(hash, 0, 6) + ".svg";
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
