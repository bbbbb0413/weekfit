package com.modi.storage;

import com.modi.common.error.ExternalServiceException;
import com.modi.common.error.NotFoundException;
import com.modi.storage.StorageConfig.StorageProperties;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

@Service
public class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);
    private static final Pattern KEY_PATTERN = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._-]{0,150}$");
    private static final String JPEG = "image/jpeg";

    private final S3Client s3;
    private final String bucket;

    public StorageService(S3Client s3, StorageProperties properties) {
        this.s3 = s3;
        this.bucket = properties.bucket();
    }

    /** 버킷이 없으면 만든다. 저장소가 꺼져 있어도 서버 기동은 막지 않는다. */
    @EventListener(ApplicationReadyEvent.class)
    public void ensureBucket() {
        try {
            s3.headBucket(b -> b.bucket(bucket));
        } catch (NoSuchBucketException e) {
            createBucketQuietly();
        } catch (SdkException e) {
            log.warn("Storage check failed for bucket '{}': {}", bucket, e.getMessage());
        }
    }

    private void createBucketQuietly() {
        try {
            s3.createBucket(b -> b.bucket(bucket));
            log.info("Created storage bucket '{}'", bucket);
        } catch (SdkException e) {
            log.warn("Could not create bucket '{}': {}", bucket, e.getMessage());
        }
    }

    public String putJpeg(byte[] jpeg) {
        String key = UUID.randomUUID() + ".jpg";
        try {
            s3.putObject(b -> b.bucket(bucket).key(key).contentType(JPEG), RequestBody.fromBytes(jpeg));
            return key;
        } catch (SdkException e) {
            throw new ExternalServiceException("이미지를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", e);
        }
    }

    public StoredImage get(String key) {
        if (!isValidKey(key)) {
            throw new NotFoundException("이미지를 찾을 수 없습니다.");
        }
        try {
            ResponseBytes<GetObjectResponse> object = s3.getObjectAsBytes(b -> b.bucket(bucket).key(key));
            String contentType = object.response().contentType();
            return new StoredImage(object.asByteArray(), contentType == null ? JPEG : contentType);
        } catch (NoSuchKeyException e) {
            throw new NotFoundException("이미지를 찾을 수 없습니다.");
        } catch (SdkException e) {
            throw new ExternalServiceException("이미지를 불러오지 못했습니다.", e);
        }
    }

    public boolean exists(String key) {
        if (!isValidKey(key)) {
            return false;
        }
        try {
            s3.headObject(b -> b.bucket(bucket).key(key));
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (SdkException e) {
            throw new ExternalServiceException("이미지 저장소에 연결하지 못했습니다.", e);
        }
    }

    public static boolean isValidKey(String key) {
        return key != null && KEY_PATTERN.matcher(key).matches() && !key.contains("..");
    }

    public static String urlOf(String key) {
        return key == null ? null : "/api/images/" + key;
    }
}
