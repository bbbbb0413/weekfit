package com.weekfit.storage;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

/**
 * S3 호환 저장소 클라이언트. 로컬은 SeaweedFS, 배포 환경은 Supabase Storage 등
 * S3 호환 엔드포인트를 환경변수로 바꿔 끼운다.
 */
@Configuration
@EnableConfigurationProperties(StorageConfig.StorageProperties.class)
public class StorageConfig {

    @Bean
    public S3Client s3Client(StorageProperties properties) {
        return S3Client.builder()
                .endpointOverride(URI.create(properties.endpoint()))
                .region(Region.of(properties.region()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(properties.accessKey(), properties.secretKey())))
                .forcePathStyle(true)
                .build();
    }

    @ConfigurationProperties(prefix = "weekfit.storage")
    public record StorageProperties(
            String endpoint,
            String region,
            String bucket,
            String accessKey,
            String secretKey) {
    }
}
