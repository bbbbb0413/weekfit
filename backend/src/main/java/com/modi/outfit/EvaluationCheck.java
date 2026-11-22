package com.modi.outfit;

public record EvaluationCheck(int score, boolean ok, String message) {

    static final int OK_THRESHOLD = 70;

    static EvaluationCheck of(int score, String message) {
        int s = Math.max(0, Math.min(100, score));
        return new EvaluationCheck(s, s >= OK_THRESHOLD, message);
    }
}
