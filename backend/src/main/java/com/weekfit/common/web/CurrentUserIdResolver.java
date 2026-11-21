package com.weekfit.common.web;

import com.weekfit.common.user.AppUser;
import com.weekfit.common.user.UserService;
import java.util.UUID;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

@Component
public class CurrentUserIdResolver implements HandlerMethodArgumentResolver {

    public static final String HEADER = "X-User-Id";

    private final UserService userService;

    public CurrentUserIdResolver(UserService userService) {
        this.userService = userService;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUserId.class) && UUID.class.equals(parameter.getParameterType());
    }

    @Override
    public UUID resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        String header = webRequest.getHeader(HEADER);
        if (header == null || header.isBlank()) {
            return AppUser.DEMO_USER_ID;
        }
        UUID userId;
        try {
            userId = UUID.fromString(header.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(HEADER + " 헤더는 UUID 형식이어야 합니다.");
        }
        return userService.getOrCreate(userId).getId();
    }
}
