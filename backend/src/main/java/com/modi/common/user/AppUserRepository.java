package com.modi.common.user;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    /** 같은 ID로 동시에 들어온 첫 요청들이 서로 부딪히지 않도록, 이미 있으면 아무 일도 하지 않는다. */
    @Modifying
    @Query(value = "insert into app_user (id, name) values (:id, :name) on conflict (id) do nothing", nativeQuery = true)
    int insertIfAbsent(@Param("id") UUID id, @Param("name") String name);
}
