package com.weekfit.closet;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClothingRepository extends JpaRepository<ClothingItem, UUID> {

    List<ClothingItem> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<ClothingItem> findByIdAndUserId(UUID id, UUID userId);

    List<ClothingItem> findByUserIdAndIdIn(UUID userId, Collection<UUID> ids);

    long countByUserId(UUID userId);
}
