# Weekfit

일정·날씨·세탁 상태를 함께 읽고 일주일 코디를 계획하는 옷장 에이전트이다.

## 구조

```
weekfit/
├── frontend/          # 프론트엔드 (담당자 별도)
├── backend/           # Spring Boot 4 + Spring AI (단일 서버)
│   └── src/main/java/com/weekfit/
│       ├── common/    # 응답 envelope, 예외 처리, CORS
│       ├── ai/        # ChatClient 설정 (외부 LLM)
│       ├── storage/   # S3 호환 저장소 클라이언트
│       ├── closet/    # 옷 등록·AI 태깅
│       ├── wear/      # 착용·세탁 기록, 상태 추정
│       ├── schedule/  # 일정 수신·마스킹·분석
│       ├── weather/   # Open-Meteo 예보
│       └── plan/      # 주간 배정·세탁 역산·설명
├── seed/images/       # 데모용 옷 사진 (최초 실행 시 업로드)
├── scripts/           # 시드 스크립트
└── docker-compose.yml # 로컬 Postgres(15432) + SeaweedFS(filer 18888, S3 18333)
```

## 로컬 실행

```bash
cp .env.example .env            # ANTHROPIC_API_KEY 입력
docker compose up -d            # Postgres, SeaweedFS, 시드 업로드
cd backend && set -a && . ../.env && set +a && ./gradlew bootRun
```

헬스 체크: `curl localhost:8080/actuator/health`
