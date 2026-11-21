package com.weekfit.ai;

import com.weekfit.common.error.ExternalServiceException;

public class AiUnavailableException extends ExternalServiceException {

    public AiUnavailableException(Throwable cause) {
        super("AI 분석을 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.", cause);
    }
}
