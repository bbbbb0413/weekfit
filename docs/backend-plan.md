# modi 백엔드 개발 계획

제출 마감은 2026-11-23(월) 17:00이다. 프론트는 별도 담당자가 개발한다.

- API 계약: [`docs/openapi.yaml`](openapi.yaml) (OpenAPI 3.1). 4장은 요약이며, 요청·응답 필드는 openapi.yaml 이 기준이다.
- 서버 실행 중에는 `/swagger-ui.html`, `/v3/api-docs` 에서 코드 기준 명세를 확인할 수 있다(P0에서 추가).

## 1. 화면 기준 기능 해석

| 화면 요소 | 기능 | 백엔드 책임 |
|---|---|---|
| 옷장 | 옷 등록·조회·수정·삭제, 옷 상태 관리 | 사진 업로드, AI 태깅 제안, 상태 추정(세탁 권장·건조 중) |
| 옷 꺼내 입히기 | 캐릭터에 옷을 드래그해 입힌다 | 화면 처리는 프론트가 맡는다. 백엔드는 "오늘 입음" 기록과 옷 평가를 제공한다 |
| 배경(기후 반영) | 현재 날씨에 따라 배경이 바뀐다 | 날씨 조회와 `condition`(CLEAR·CLOUDY·RAIN·SNOW·FOG·THUNDER) 제공 |
| 옷 평가 | 캐릭터에 입힌 조합을 평가한다 | 날씨 적합도·일정(TPO) 적합도·색 조합·세탁 상태 점수와 교체 제안 |
| 캘린더 기반 옷 추천 | 일주일 일정과 예보로 코디를 계획한다 | 일정 마스킹·분석, 주간 배정, 세탁 역산 |
| 사진 넣어서 가성비 옷 찾기 | 사진 속 옷과 비슷한 상품을 여러 쇼핑몰에서 찾는다 | 사진 분석 → 검색어 생성 → 쇼핑몰 5곳의 검색 링크 생성(전문몰 4곳 낮은 가격순, 11번가 인기순) |
| 비슷한 옷 보유 검사 | 사려는 옷과 비슷한 옷이 옷장에 있는지 확인한다 | 사진 분석 → 옷장 속성 비교 → 중복·유사·신규 판정, 함께 입을 수 있는 옷 수 |

**가정**: "옷 평가"는 캐릭터에 입힌 조합을 그날 날씨와 일정 기준으로 평가하는 기능으로 해석했다. 다른 의미라면 4장의 평가 API만 바꾸면 된다.

## 2. 모듈 구성

```
com.modi
├── common    응답 envelope, 예외, CORS, 사용자 식별, 요청 제한
├── ai        ChatClient, 옷 사진 분석기(옷장·쇼핑·보유 검사가 공유)
├── storage   S3 호환 저장소, 이미지 정규화(축소·EXIF 제거)
├── closet    옷 CRUD, 상태 관리, 세탁, 비슷한 옷 보유 검사
├── wear      착용 기록, 체감 피드백(추움·적당·더움)
├── weather   Open-Meteo 조회, 날씨 코드 변환, 보온 기준
├── schedule  일정 저장, 개인정보 마스킹, 일정 분석(AI + 규칙 대체)
├── plan      주간 추천, 세탁 역산, 하루 추천, 옷 평가
├── shopping  쇼핑몰별 낮은 가격순 검색 링크 생성
└── demo      심사용 데모 데이터 시드
```

## 3. AI 사용처와 대체 경로

| 기능 | AI 역할 | AI 실패 시 |
|---|---|---|
| 옷 등록 | 사진에서 종류·색·보온성·스타일·격식 추출, 신뢰도 반환 | 빈 제안을 반환하고 사용자가 직접 입력한다 |
| 일정 분석 | 마스킹한 일정 텍스트에서 TPO·격식·피할 색·활동량 추론 | 키워드 규칙 분류로 전환한다 |
| 주간 추천 설명 | 규칙 엔진이 고른 결과를 자연어로 설명 | 규칙 근거를 템플릿 문장으로 출력한다 |
| 옷 평가 | 색 조합 평가, 총평, 교체 제안 | 규칙 점수만 반환한다 |
| 가성비 찾기·보유 검사 | 사진 속성 추출, 쇼핑 검색어 생성 | 오류를 반환한다(사진 분석이 핵심이라 대체가 없다) |

배정·세탁 역산·점수 계산은 규칙 코드로 처리한다. 날짜와 횟수 계산을 LLM에 맡기지 않아 결과가 항상 같다.

**개인정보**: 일정 제목과 장소는 저장 전에 마스킹한다(전화번호·이메일·URL·"○○님/씨"·"○○랑/와" 패턴). LLM에는 마스킹된 텍스트만 보낸다. 업로드 사진은 저장 전에 EXIF(촬영 위치 포함)를 제거한다.

## 4. API 명세

모든 응답은 `{ "success": boolean, "data": ..., "error": string|null }` 형식이다. 사용자 식별은 `X-User-Id` 헤더(UUID)로 하며, 헤더가 없으면 데모 사용자로 처리한다.

### 옷장
| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/clothes/analyze` | multipart `image`(JPEG·PNG, 10MB 이하). 이미지를 저장하고 AI 태깅 제안을 반환한다 |
| POST | `/api/clothes` | 제안을 사용자가 확인·수정한 값으로 옷을 저장한다 |
| GET | `/api/clothes?category=&status=` | 옷 목록. `effectiveStatus`, `needsWash` 포함 |
| GET·PATCH·DELETE | `/api/clothes/{id}` | 단건 조회·수정·삭제 |
| PATCH | `/api/clothes/{id}/status` | `AVAILABLE`·`LAUNDRY`·`REPAIR` 수동 변경 |
| POST | `/api/laundry` | `{ itemIds, dryHours? }` 세탁 시작. 건조 시간이 지나면 자동으로 입을 수 있음 상태가 된다 |
| POST | `/api/clothes/similar-check` | multipart `image`. 비슷한 옷 보유 검사 |
| GET | `/api/images/{key}` | 저장된 옷 이미지 |

옷 속성 값:
- `category`: `TOP`·`BOTTOM`·`OUTER`·`DRESS`·`SHOES`·`ACCESSORY`
- `colors`: 블랙·화이트·그레이·네이비·블루·베이지·브라운·카키·그린·레드·핑크·퍼플·옐로·오렌지·멀티
- `styles`: 캐주얼·미니멀·포멀·스포티·스트릿·빈티지·페미닌·아웃도어
- `warmth`·`formality`: 1~5

### 착용
| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/wear-logs` | `{ date, itemIds, feedback? }` 입은 옷 기록. `feedback`은 `COLD`·`OK`·`HOT`이며 개인 보온 기준을 조정한다 |
| GET | `/api/wear-logs?from=&to=` | 착용 기록 |

### 날씨
| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/weather?lat=&lon=` | 현재·시간별(24시간)·일별(7일) 예보와 배경용 `condition`. 좌표가 없으면 서울 기준 |

### 일정
| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/events/mask-preview` | `{ title, location }` → AI에 보낼 마스킹 결과 미리보기 |
| PUT | `/api/events/sync` | `{ events: [{ externalId, title, startsAt, endsAt, location }] }` 구글 캘린더 일정 동기화(마스킹 후 저장·분석) |
| POST | `/api/events` | 일정 직접 입력 |
| GET | `/api/events?from=&to=` | 일정과 분석 결과 |
| DELETE | `/api/events/{id}` | 일정 삭제 |

### 추천·평가
| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/plans/week?start=&lat=&lon=` | 7일 코디 계획, 세탁 할 일, 충돌 안내 |
| POST | `/api/plans/day` | `{ date, anchorItemId?, tpo?, lat?, lon? }` 하루 추천. 꼭 입을 옷 1벌을 고정할 수 있다 |
| POST | `/api/outfits/evaluate` | `{ itemIds, date?, eventId?, tpo?, lat?, lon? }` 입힌 조합 평가 |

### 쇼핑

네이버 쇼핑 검색 API가 2026-07-31에 종료되어 상품 데이터를 직접 받지 않고 쇼핑몰 검색 링크를 만든다. 정렬 주소는 2026-11-21에 각 쇼핑몰 화면에서 확인했다.
| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/shopping/similar` | multipart `image`. 검색어와 쇼핑몰별 낮은 가격순 검색 링크를 돌려준다 |
| GET | `/api/shopping/links?query=` | 고친 검색어로 링크만 다시 만든다. AI를 호출하지 않는다 |

## 5. 데이터 모델

| 테이블 | 주요 컬럼 |
|---|---|
| `app_user` | id, name, warmth_bias(-2~2) |
| `clothing_item` | id, user_id, name, image_key, category, sub_type, colors(text[]), warmth, styles(text[]), formality, status, wears_since_wash, wash_threshold, dry_until, last_worn_on |
| `wear_log` | id, user_id, worn_on, item_ids(uuid[]), feedback |
| `calendar_event` | id, user_id, external_id, title(마스킹), location(마스킹), starts_at, ends_at, tpo, formality, dress_code, avoid_colors(text[]), indoor, activity_level, importance, confidence, analysis_source, clarify_question |

## 6. 구현 단계

| 단계 | 범위 | 목표 시점 |
|---|---|---|
| P0 | 공통(사용자 식별·예외·요청 제한), 저장소, 옷장 CRUD·AI 태깅·상태·세탁, 착용 기록, 날씨, 데모 시드 | 11/21 밤. 프론트가 옷장·배경 화면을 붙일 수 있다 |
| P1 | 일정 마스킹·분석, 주간 추천·세탁 역산, 하루 추천, 옷 평가 | 11/22 오전 |
| P2 | 비슷한 옷 보유 검사, 가성비 옷 찾기 | 11/22 오후 |
| P3 | 실제 API 키로 통합 확인, 배포, AI 활용내역 정리 | 11/22 밤~11/23 오전 |

## 7. 필요한 외부 키

LLM 제공사는 `AI_PROVIDER` 로 고른다. 기본값은 `anthropic`(Claude)이며 `openai`, `google-genai`(Gemini)로 바꿀 수 있다. 코드는 Spring AI `ChatClient` 만 사용하므로 제공사를 바꿔도 코드 수정이 필요 없다.

| 키 | 용도 | 발급 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude 호출(기본) | Claude Console. Max 플랜 월 $100 API 크레딧 사용 |
| `OPENAI_API_KEY` | GPT 호출(대체) | OpenAI Platform |
| `GEMINI_API_KEY` | Gemini 호출(대체) | Google AI Studio |
