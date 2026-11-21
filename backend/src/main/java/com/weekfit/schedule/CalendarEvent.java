package com.weekfit.schedule;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** 일정. 제목·장소는 마스킹된 값만 저장한다. */
@Entity
@Table(name = "calendar_event")
public class CalendarEvent {

    @Id
    private UUID id;
    @Column(nullable = false)
    private UUID userId;
    private String externalId;
    @Column(nullable = false)
    private String title;
    private String location;
    @Column(nullable = false)
    private Instant startsAt;
    @Column(nullable = false)
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Tpo tpo;
    @Column(nullable = false)
    private int formality;
    private String dressCode;
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "text[]")
    private List<String> avoidColors;
    private Boolean indoor;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityLevel activityLevel;
    @Column(nullable = false)
    private int importance;
    @Column(nullable = false)
    private double confidence;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnalysisSource analysisSource;
    private String clarifyQuestion;
    @Column(nullable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant updatedAt;

    protected CalendarEvent() {
    }

    public static CalendarEvent create(UUID userId, String externalId, String maskedTitle, String maskedLocation,
            Instant startsAt, Instant endsAt, EventAnalysis analysis, Instant now) {
        CalendarEvent e = new CalendarEvent();
        e.id = UUID.randomUUID();
        e.userId = userId;
        e.externalId = externalId;
        e.createdAt = now;
        e.updateContent(maskedTitle, maskedLocation, startsAt, endsAt, now);
        e.applyAnalysis(analysis, now);
        return e;
    }

    /** 내용이 바뀌었으면 true. 바뀐 일정만 다시 분석한다. */
    public boolean contentDiffers(String maskedTitle, String maskedLocation, Instant startsAt, Instant endsAt) {
        return !title.equals(maskedTitle) || !java.util.Objects.equals(location, maskedLocation)
                || !this.startsAt.equals(startsAt) || !this.endsAt.equals(endsAt);
    }

    public void updateContent(String maskedTitle, String maskedLocation, Instant startsAt, Instant endsAt, Instant now) {
        if (endsAt.isBefore(startsAt)) {
            throw new IllegalArgumentException("endsAt 은 startsAt 이후여야 합니다.");
        }
        this.title = maskedTitle;
        this.location = maskedLocation;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.updatedAt = now;
    }

    public void applyAnalysis(EventAnalysis a, Instant now) {
        this.tpo = a.tpo();
        this.formality = a.formality();
        this.dressCode = a.dressCode();
        this.avoidColors = List.copyOf(a.avoidColors());
        this.indoor = a.indoor();
        this.activityLevel = a.activityLevel();
        this.importance = a.importance();
        this.confidence = a.confidence();
        this.analysisSource = a.source();
        this.clarifyQuestion = a.clarifyQuestion();
        this.updatedAt = now;
    }

    public EventAnalysis analysis() {
        return new EventAnalysis(tpo, formality, dressCode, avoidColors, indoor, activityLevel, importance,
                confidence, analysisSource, clarifyQuestion);
    }

    public UUID getId() { return id; }
    public String getExternalId() { return externalId; }
    public String getTitle() { return title; }
    public String getLocation() { return location; }
    public Instant getStartsAt() { return startsAt; }
    public Instant getEndsAt() { return endsAt; }
}
