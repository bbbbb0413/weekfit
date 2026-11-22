package com.modi.common.user;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final AppUserRepository repository;

    public UserService(AppUserRepository repository) {
        this.repository = repository;
    }

    /**
     * 처음 보는 사용자 ID면 게스트로 만든다. 브라우저마다 UUID를 발급해 쓰는 방식을 전제로 한다.
     * 첫 화면은 여러 API를 동시에 부르므로, 생성은 on conflict do nothing으로 해 중복 키 오류를 막는다.
     */
    @Transactional
    public AppUser getOrCreate(UUID userId) {
        return repository.findById(userId).orElseGet(() -> {
            repository.insertIfAbsent(userId, AppUser.GUEST_NAME);
            return repository.findById(userId).orElseThrow();
        });
    }
}
