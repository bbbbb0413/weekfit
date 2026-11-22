package com.modi.common.error;

/** 외부 서비스(LLM, 날씨, 쇼핑 검색, 저장소) 호출 실패. 사용자에게는 503으로 알린다. */
public class ExternalServiceException extends RuntimeException {

    public ExternalServiceException(String message, Throwable cause) {
        super(message, cause);
    }

    public ExternalServiceException(String message) {
        super(message);
    }
}
