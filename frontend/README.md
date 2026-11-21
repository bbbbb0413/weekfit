# Weekfit 프론트엔드

일정, 날씨, 세탁 상태를 함께 읽고 일주일 코디를 계획하는 옷장 에이전트의 화면이다. API 계약은 [`docs/openapi.yaml`](../docs/openapi.yaml)을 따른다.

## 실행

```bash
cd frontend
npm install
cp .env.example .env.local   # 필요할 때만
npm run dev                  # http://localhost:5173
```

Node 22 기준이다. `npm run build`는 타입 검사 후 `dist/`에 빌드한다.

## API 모드

| `VITE_API_MODE` | 동작 |
|---|---|
| `mock` (기본) | 백엔드 없이 브라우저 안의 데모 데이터로 동작한다. 옷장은 백엔드 `DemoClosetSeed`와 같은 17벌이고, 변경 내용은 localStorage에 저장된다. 날씨는 Open-Meteo를 직접 조회하고 실패하면 예시 예보를 쓴다 |
| `real` | `VITE_API_BASE_URL`(기본 `http://localhost:8080`)의 백엔드를 호출한다 |

`real` 모드에서 일정, 주간 계획, 옷 평가 엔드포인트가 404를 주면(백엔드가 해당 기능 없이 떠 있는 경우), 같은 응답 형식의 브라우저 규칙 계산(`src/api/local/engine.ts`)으로 대신한다. 엔드포인트가 응답하면 서버 결과를 그대로 쓴다. 가성비 찾기와 보유 검사는 사진 분석이 필요해 `mock` 모드에서는 예시 결과임을 화면에 표시한다. 가성비 찾기의 쇼핑몰 링크는 백엔드와 같은 규칙(`src/api/local/shopping.ts`)으로 만들어 `mock` 모드에서도 검색어를 고치면 실제 검색 결과로 연결된다.

사용자 식별 헤더(`X-User-Id`)는 보내지 않아 백엔드의 데모 사용자로 동작한다.

## 화면

| 경로 | 화면 | 사용하는 API |
|---|---|---|
| `/` | 옷방. 3D 방 안의 인형에 옷을 입혀 보고 평가받는다. 창밖 날씨가 실제 예보에 맞춰 움직인다. 옷 등록, 상태 변경, 세탁 시작, 착용 기록 | `/api/clothes*`, `/api/laundry`, `/api/weather`, `/api/events`, `/api/outfits/evaluate`, `/api/wear-logs` |
| `/week` | 주간 계획. 7일 코디, 세탁 할 일, 일정 직접 입력 | `/api/plans/week`, `/api/events*`, `/api/laundry` |
| `/shop` | 사진으로 가성비 옷 찾기. 검색어를 만들어 쇼핑몰 5곳의 검색 결과로 연결하고, 검색어를 고치면 링크를 다시 만든다 | `/api/shopping/similar`, `/api/shopping/links` |
| `/similar` | 비슷한 옷 보유 검사 | `/api/clothes/similar-check` |

## 구조

```
src/
├── api/
│   ├── types.ts        openapi.yaml 스키마를 옮긴 타입
│   ├── client.ts       응답 envelope 해제, 오류 문구
│   ├── index.ts        화면에서 쓰는 API 함수 (모드 전환)
│   └── local/          데모 데이터, 브라우저 규칙 계산
├── components/         인형, 옷 그림, 행거, 시트
│   └── stage3d/        3D 방, 창밖 날씨 효과, 종이인형 (three.js)
├── hooks/queries.ts    TanStack Query 훅
├── pages/              화면 4개
├── store/outfit.ts     인형에 입힌 옷 (Zustand)
└── styles/global.css   디자인 토큰 & 스타일
```

옷 사진이 없는 옷은 종류와 색에 맞춘 그림(`components/Garment.tsx`)으로 보여준다. 인형에 입힌 모습은 항상 그림으로 그린다.

## 3D 옷방

옷방 무대는 three.js(React Three Fiber)로 만든 방이다. 인형과 옷은 평면 그림을 종이처럼 겹겹이 세워 배치했고, 무대를 좌우로 끌면 방을 돌려 볼 수 있다. 방 안 행거에는 아래 탭에서 고른 종류의 옷이 6벌까지 걸리고, 눌러서 입힐 수 있다.

창밖은 `/api/weather`의 `current.condition` 값에 따라 달라진다.

| 값 | 창밖 |
|---|---|
| `CLEAR` | 햇살이 도는 해, 바닥에 떨어지는 햇빛과 떠다니는 먼지 |
| `CLOUDY` | 깊이가 다른 구름 9장이 서로 다른 속도로 흐름 |
| `RAIN` | 빗줄기 260개, 유리창을 타고 내리는 빗방울 |
| `SNOW` | 눈송이 240개, 창턱과 건물 지붕에 쌓이는 눈 |
| `FOG` | 좌우로 느리게 오가는 안개 띠 |
| `THUNDER` | 빗줄기 420개, 4~7초 간격의 번개 |

`mock` 모드에서는 무대 오른쪽 위에서 날씨를 바꿔 볼 수 있다. 오늘 기온과 강수 확률도 함께 바뀌어 옷 평가와 주간 계획에 반영되고, 새로고침하면 실제 날씨로 돌아온다.

3D 코드는 옷방에 들어올 때 따로 내려받는다(gzip 약 250KB). WebGL을 쓸 수 없는 브라우저에서는 평면 그림 무대로 바뀌고, 운영체제의 움직임 줄이기 설정이 켜져 있으면 날씨 효과가 멈춘 한 장면만 그린다.

## 아직 없는 것

- 구글 캘린더 동기화(`PUT /api/events/sync`). 일정은 직접 입력만 된다
- 옷 속성 수정(`PATCH /api/clothes/{id}`) 화면
- 하루 추천(`POST /api/plans/day`) 화면
- 위치 기반 날씨. 지금은 서울 기준이다

## Credits / Licenses

| 이름 | 라이선스 | 용도 |
|---|---|---|
| React, React Router | MIT | 화면 구성 |
| TanStack Query | MIT | 서버 상태 관리 |
| Zustand | MIT | 화면 상태 관리 |
| three.js, React Three Fiber | MIT | 3D 옷방 |
| Vite | MIT | 빌드 도구 |
| IBM Plex Sans KR (Fontsource) | OFL-1.1 | 본문 글꼴 |
| Bagel Fat One (Fontsource) | OFL-1.1 | 제목과 숫자 글꼴 |
| Open-Meteo | CC BY 4.0 (데이터) | 데모 모드 날씨 조회 |
