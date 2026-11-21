package com.weekfit.schedule;

import java.util.List;

public record EventAnalysis(
        Tpo tpo,
        int formality,
        String dressCode,
        List<String> avoidColors,
        Boolean indoor,
        ActivityLevel activityLevel,
        int importance,
        double confidence,
        AnalysisSource source,
        String clarifyQuestion) {

    public EventAnalysis {
        avoidColors = avoidColors == null ? List.of() : List.copyOf(avoidColors);
    }
}
