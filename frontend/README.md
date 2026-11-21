# Weekfit 프론트엔드

일정, 날씨, 세탁 상태를 함께 읽고 일주일 코디를 계획하는 옷장 에이전트의 화면이다. API 계약은 [`docs/openapi.yaml`](../docs/openapi.yaml)을 따른다.

## 실행

```bash
cd frontend
npm install
cp .env.example .env.local   # 필요할 때만
npm run dev                  # http://localhost:5173
```

실서버(`http://localhost:8080`)에 붙여 실행하려면 `.env.local`의 `VITE_API_MODE`를 `real`로 바꾸거나, 환경 변수로 넘긴다.

```bash
VITE_API_MODE=real npm run dev
```

Node 22 기준이다. `npm run build`는 타입 검사 후 `dist/`에 빌드한다.

## API 모드

| `VITE_API_MODE` | 동작 |
|---|---|
| `mock` (기본) | 백엔드 없이 브라우저 안의 데모 데이터로 동작한다. 옷장은 백엔드 `DemoClosetSeed`와 같은 17벌이고, 변경 내용은 localStorage에 저장된다. 날씨는 Open-Meteo를 직접 조회하고 실패하면 예시 예보를 쓴다 |
| `real` | `VITE_API_BASE_URL`(기본 `http://localhost:8080`)의 백엔드를 호출한다 |

`real` 모드에서 일정, 주간 계획, 옷 평가 엔드포인트가 404를 주면(백엔드가 해당 기능 없이 떠 있는 경우), 같은 응답 형식의 브라우저 규칙 계산(`src/api/local/engine.ts`)으로 대신한다. 엔드포인트가 응답하면 서버 결과를 그대로 쓴다. 보유 검사는 사진 분석이 필요해 `mock` 모드에서는 예시 결과임을 화면에 표시하고, AI 제품 찾기는 쓸 수 없다고 안내한다. 쇼핑몰 링크는 백엔드와 같은 규칙(`src/api/local/shopping.ts`)으로 만들어 `mock` 모드에서도 검색어를 고치면 실제 검색 결과로 연결된다.

사용자 식별 헤더(`X-User-Id`)는 보내지 않아 백엔드의 데모 사용자로 동작한다.

## 화면

| 경로 | 화면 | 사용하는 API |
|---|---|---|
| `/` | 오늘. 모디가 고른 코디 보드, 점수와 고른 이유(날씨, 일정, 색 조합, 세탁), 칸을 눌러 바꿔 입기, 착용 기록과 체감 피드백 | `/api/plans/week`, `/api/outfits/evaluate`, `/api/wear-logs`, `/api/weather`, `/api/events`, `/api/clothes` |
| `/week` | 주간. 세탁 할 일(마감 순), 7일 코디, 일정 직접 입력 | `/api/plans/week`, `/api/events*`, `/api/laundry` |
| `/closet` | 옷장. 옷 사진 목록, 종류 필터, 옷 등록, 상태 변경, 세탁 시작 | `/api/clothes*`, `/api/laundry` |
| `/buy` | 사기 전에. 사려는 옷 사진 한 장으로 보유 검사를 먼저 하고, 오늘 코디에 넣어 본 뒤, 더 싼 실제 제품(최대 2개)을 찾는다. 제품 찾기는 20~30초 걸려 단계별 대기 화면을 보여 주고, 쇼핑몰 5곳의 검색 링크를 함께 둔다. AI 제품 찾기는 `mock` 모드에서 쓸 수 없다고 안내한다 | `/api/clothes/similar-check`, `/api/shopping/find`, `/api/shopping/links` |

## 구조

```
src/
├── api/
│   ├── types.ts        openapi.yaml 스키마를 옮긴 타입
│   ├── client.ts       응답 envelope 해제, 오류 문구
│   ├── index.ts        화면에서 쓰는 API 함수 (모드 전환)
│   └── local/          데모 데이터, 브라우저 규칙 계산
├── components/         코디 보드, 날씨 띠, 모디 안내, 시트
├── hooks/queries.ts    TanStack Query 훅
├── pages/              화면 4개
├── store/outfit.ts     오늘 보드에 올린 옷 (Zustand)
└── styles/global.css   디자인 토큰 & 스타일
```

## 코디 보드

겉옷, 상의, 하의, 신발을 사진 칸으로 보여 주는 `components/OutfitBoard.tsx`를 오늘, 주간, 사기 전에 화면이 함께 쓴다. 오늘 화면에서는 칸을 누르면 그 종류의 내 옷이 시트로 올라오고, 옷을 바꾸면 `/api/outfits/evaluate`로 점수와 이유를 다시 받는다. 사기 전에 화면에서는 사려는 옷이나 찾은 제품을 해당 칸에 넣어 오늘 코디와 함께 보여 준다. 사진이 없는 옷은 대표 색 견본으로 표시한다.

## 모디 캐릭터

`components/Modi.tsx`가 포즈 8가지(`hello`, `pick`, `think`, `rain`, `cold`, `cheer`, `sorry`, `empty`)를 그린다. 포즈마다 몸 그림 한 장과 효과 그림(반짝임, 점, 빗방울, 땀방울, 물음표)을 따로 잘라 `assets/modi/`에 두었고, 그림자는 CSS로 그린다. 세 층을 겹친 뒤 framer-motion으로 따로 움직인다. 모든 포즈는 발 높이와 키를 맞춰 같은 높이(378px)로 잘라서 포즈가 바뀌어도 크기가 달라지지 않는다.

| 포즈 | 나오는 곳 |
|---|---|
| `pick` | 오늘 코디 추천 한마디 |
| `rain`, `cold` | 비, 눈, 뇌우인 날과 체감 8도 이하인 날의 한마디 |
| `think` | 코디 계산, 주간 계획, 제품 찾기 대기 |
| `cheer` | 착용 기록을 마친 뒤 |
| `hello` | 추천 코디를 직접 바꿨을 때 |
| `sorry` | 불러오기 실패, 제품 찾기 실패 |
| `empty` | 옷장이 비어 있을 때 |

운영체제의 움직임 줄이기 설정이 켜져 있으면 멈춘 그림만 보여 준다. framer-motion은 `LazyMotion`과 `domAnimation`으로 필요한 기능만 불러온다.

## 화면 상태

화면마다 불러오는 중, 비어 있음, 실패 상태를 두고 모디 캐릭터가 안내한다. AI 결과에는 출처(AI 평가 또는 규칙 평가)를 함께 적고, AI 연결이 안 되면 규칙 계산 결과임을 그대로 알린다.

오늘 화면 위쪽의 날씨 띠는 `/api/weather`의 `current.condition` 값에 따라 하늘색과 움직임이 바뀐다. `CLEAR`는 햇살이 도는 해, `CLOUDY`는 서로 다른 속도로 흐르는 구름 세 장, `FOG`는 좌우로 오가는 안개 띠, `RAIN`은 빗줄기 13개, `SNOW`는 흔들리며 내리는 눈송이 13개, `THUNDER`는 빨라진 빗줄기와 5초 간격의 번개다. 모두 CSS 키프레임으로 만들었다. `mock` 모드에서는 오른쪽 위에서 날씨를 바꿔 볼 수 있고, 오늘 기온과 강수 확률도 함께 바뀌어 추천과 평가에 반영된다. 새로고침하면 실제 날씨로 돌아온다. 운영체제의 움직임 줄이기 설정이 켜져 있으면 움직임을 멈춘다.

## 아직 없는 것

- 구글 캘린더 동기화(`PUT /api/events/sync`). 일정은 직접 입력만 된다
- 옷 속성 수정(`PATCH /api/clothes/{id}`) 화면
- 하루 추천(`POST /api/plans/day`) 연결. 오늘 코디는 주간 계획의 첫날을 쓴다
- 위치 기반 날씨. 지금은 서울 기준이다

## Credits / Licenses

| 이름 | 라이선스 | 용도 |
|---|---|---|
| React, React Router | MIT | 화면 구성 |
| TanStack Query | MIT | 서버 상태 관리 |
| Zustand | MIT | 화면 상태 관리 |
| clothing-dataset-small (Alexey Grigorev) | CC0 1.0 | 데모 옷장의 하의, 아우터, 신발, 스트라이프 티셔츠 사진 12장 (배경 제거 후 사용) |
| Canva AI 이미지 생성 | AI 생성물 | 데모 옷장의 상의 사진 5장 |
| modi 로고, 모디 캐릭터 8포즈 | 팀 제작 (AI 이미지 도구로 만든 그림. 제출 전 도구명 기재 필요) | 오늘 화면 로고, 모디 안내 |
| framer-motion | MIT | 모디 캐릭터 움직임 |
| Vite | MIT | 빌드 도구 |
| IBM Plex Sans KR (Fontsource) | OFL-1.1 | 화면 글꼴 |
| Open-Meteo | CC BY 4.0 (데이터) | 데모 모드 날씨 조회 |
