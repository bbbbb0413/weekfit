// 기능: 화면에서 쓰는 API 함수. mock 모드는 브라우저 데모 데이터, real 모드는 백엔드 호출

import { API_MODE, ApiError, get, send, upload } from './client';
import { analyzeEvent, evaluateOutfit, maskText, planDayLocal, planWeek } from './local/engine';
import { localStore } from './local/store';
import type {
  AvatarModel,
  AvatarPaint,
  LookResult,
  CalendarEvent,
  Category,
  DayPlan,
  DayPlanRequest,
  Clothing,
  ClothingAnalysisResult,
  ClothingCreateRequest,
  ClothingSpec,
  EvaluateRequest,
  EventInput,
  FindResult,
  ItemStatus,
  MaskPreview,
  OutfitEvaluation,
  ShoppingResult,
  SimilarCheckResult,
  Sourced,
  WearLog,
  WearLogRequest,
  WeatherCondition,
  WeatherReport,
  WeekPlan,
} from './types';
import { addDays, dateOfIso, today } from '../lib/date';
import { place } from '../lib/session';

const mock = API_MODE === 'mock';

// 사용자가 허용한 위치가 있으면 날씨 & 추천 요청에 함께 보냄
const where = () => place() ?? {};

// 백엔드에 아직 없는 엔드포인트면 대체 계산으로 전환. busyToo 를 주면 요청 한도 초과(429) & 일시 장애(503)에도 전환
async function orLocal<T>(remote: () => Promise<T>, local: () => T | Promise<T>, busyToo = false): Promise<T> {
  if (mock) return local();
  try {
    return await remote();
  } catch (error) {
    if (error instanceof ApiError && (error.notReady || (busyToo && (error.status === 429 || error.status === 503)))) return local();
    throw error;
  }
}

export const api = {
  // ---------- 옷장 ----------
  // 옷 사진을 보고 AI가 그린 아바타 옷 그림. mock 모드는 AI가 없어 옷 색으로 칠함
  avatarPaint: (id: string, model: AvatarModel): Promise<AvatarPaint> =>
    mock ? Promise.resolve({ svg: null, aiAvailable: false }) : get(`/api/clothes/${id}/avatar-paint`, { model }),

  listClothes: (): Promise<Clothing[]> => (mock ? Promise.resolve(localStore.listClothes()) : get('/api/clothes')),

  analyzeClothing: (image: File): Promise<ClothingAnalysisResult> =>
    mock ? localStore.analyze(image) : upload('/api/clothes/analyze', { image }),

  createClothing: (body: ClothingCreateRequest): Promise<Clothing> =>
    mock ? Promise.resolve(localStore.createClothing(body)) : send('POST', '/api/clothes', body),

  updateClothing: (id: string, body: ClothingSpec): Promise<Clothing> =>
    mock ? Promise.resolve(localStore.updateClothing(id, body)) : send('PATCH', `/api/clothes/${id}`, body),

  deleteClothing: (id: string): Promise<null> =>
    mock ? Promise.resolve((localStore.deleteClothing(id), null)) : send('DELETE', `/api/clothes/${id}`),

  changeStatus: (id: string, status: Exclude<ItemStatus, 'DRYING'>): Promise<Clothing> =>
    mock ? Promise.resolve(localStore.changeStatus(id, status)) : send('PATCH', `/api/clothes/${id}/status`, { status }),

  startLaundry: (itemIds: string[], dryHours?: number): Promise<Clothing[]> =>
    mock ? Promise.resolve(localStore.startLaundry(itemIds, dryHours)) : send('POST', '/api/laundry', { itemIds, dryHours }),

  // ---------- 착용 ----------
  recordWear: (body: WearLogRequest): Promise<WearLog> =>
    mock ? Promise.resolve(localStore.recordWear(body)) : send('POST', '/api/wear-logs', body),

  listWearLogs: (from: string, to: string): Promise<WearLog[]> =>
    orLocal(
      () => get('/api/wear-logs', { from, to }),
      () => (mock ? localStore.listWearLogs(from, to) : []),
    ),

  // ---------- 날씨 ----------
  weather: (): Promise<WeatherReport> => (mock ? localStore.weather(place()) : get('/api/weather', where())),
  // 데모 전용: 오늘 날씨를 다른 상황으로 바꿔 보기
  demoWeather: () => localStore.demoWeather(),
  setDemoWeather: (condition: WeatherCondition | null) => localStore.setDemoWeather(condition),

  // ---------- 일정 ----------
  listEvents: (from: string, to: string): Promise<CalendarEvent[]> =>
    orLocal(
      () => get('/api/events', { from, to }),
      () => localStore.listEvents(from, to),
    ),

  createEvent: (body: EventInput): Promise<CalendarEvent> =>
    orLocal(
      () => send('POST', '/api/events', body),
      () => localStore.createEvent(body),
    ),

  deleteEvent: (id: string): Promise<null> =>
    orLocal(
      () => send<null>('DELETE', `/api/events/${id}`),
      () => (localStore.deleteEvent(id), null),
    ),

  // 가져온 캘린더 일정으로 해당 기간을 통째로 맞춤. 목록에 없는 기존 일정은 지워짐
  syncEvents: (from: string, to: string, events: EventInput[]): Promise<CalendarEvent[]> =>
    orLocal(
      () => send('PUT', '/api/events/sync', { from, to, events }),
      () => localStore.syncEvents(from, to, events),
    ),

  maskPreview: (title: string, location?: string): Promise<MaskPreview> =>
    orLocal(
      () => send('POST', '/api/events/mask-preview', { title, location }),
      () => maskText(title, location),
    ),

  // ---------- 추천 & 평가 ----------
  weekPlan: (start: string): Promise<WeekPlan> =>
    orLocal(
      () => get('/api/plans/week', { start, ...where() }),
      async () => {
        const [closet, events, weather] = await Promise.all([
          api.listClothes(),
          api.listEvents(start, addDays(start, 6)),
          api.weather().catch(() => null),
        ]);
        return planWeek({
          start,
          closet,
          events,
          daily: weather?.daily ?? [],
          warmthBias: mock ? localStore.warmthBias() : 0,
          now: new Date(),
        });
      },
    ),

  // 하루 추천. 꼭 입을 옷이나 옷차림 기준을 정해 다시 고를 때 사용
  planDay: (body: DayPlanRequest): Promise<DayPlan> =>
    orLocal(
      () => send('POST', '/api/plans/day', { ...where(), ...body }),
      async () => {
        const [closet, events, weather] = await Promise.all([
          api.listClothes(),
          api.listEvents(body.date, body.date),
          api.weather().catch(() => null),
        ]);
        return planDayLocal({ body, closet, events, daily: weather?.daily ?? [], warmthBias: mock ? localStore.warmthBias() : 0 });
      },
    ),

  evaluate: (body: EvaluateRequest): Promise<OutfitEvaluation> =>
    orLocal(
      () => send('POST', '/api/outfits/evaluate', { ...where(), ...body }),
      async () => {
        const date = body.date ?? today();
        const [closet, events, weather] = await Promise.all([
          api.listClothes(),
          api.listEvents(date, date),
          api.weather().catch(() => null),
        ]);
        const event =
          events.find((e) => e.id === body.eventId) ??
          (body.tpo
            ? null
            : events
                .filter((e) => dateOfIso(e.startsAt) === date)
                .reduce<CalendarEvent | null>((top, e) => (!top || e.analysis.importance > top.analysis.importance ? e : top), null));
        const analysis = event?.analysis ?? { ...analyzeEvent(''), tpo: body.tpo ?? 'DAILY', formality: body.tpo === 'WORK' ? 3 : 2 };
        return evaluateOutfit({
          items: closet.filter((c) => body.itemIds.includes(c.id)),
          closet,
          day: weather?.daily.find((d) => d.date === date) ?? null,
          tpo: analysis.tpo,
          formality: analysis.formality,
          avoidColors: analysis.avoidColors,
          dressCode: analysis.dressCode,
          eventTitle: event?.title ?? null,
          warmthBias: mock ? localStore.warmthBias() : 0,
        });
      },
      // 옷을 바꿀 때마다 호출하므로 한도를 넘으면 규칙 평가로 이어 감 (화면에 규칙 평가로 표시)
      true,
    ),

  // ---------- 사진 기능 (AI 필요) ----------
  similarCheck: async (image: File): Promise<Sourced<SimilarCheckResult>> =>
    mock
      ? { data: localStore.similarSample(), source: 'local' }
      : { data: await upload<SimilarCheckResult>('/api/clothes/similar-check', { image }), source: 'server' },

  shoppingSimilar: async (image: File): Promise<Sourced<ShoppingResult>> =>
    mock
      ? { data: localStore.shoppingSample(), source: 'local' }
      : { data: await upload<ShoppingResult>('/api/shopping/similar', { image }), source: 'server' },

  // AI 웹 검색으로 더 싼 실제 제품 찾기. 20~30초 걸린다. mock 모드는 사진 분석을 못 해 null
  // 살까 말까: 코디 사진 한 장을 부위별 카드로 나눔 (AI 1회)
  shoppingLook: (image: File): Promise<LookResult> =>
    mock ? Promise.resolve({ pieces: [], aiAvailable: false }) : upload<LookResult>('/api/shopping/look', { image }),

  // 살까 말까 카드 하나: 빈손이면 서버가 검색어를 바꿔 최대 3번까지 다시 찾음
  lookFind: async (input: { image?: File; queries: string[] }): Promise<FindResult | null> =>
    mock ? null : upload<FindResult>('/api/shopping/look/find', { image: input.image, queries: input.queries.join('\n') }),

  shoppingFind: async (input: { image?: File; text?: string }): Promise<FindResult | null> =>
    mock ? null : upload<FindResult>('/api/shopping/find', { image: input.image, text: input.text }),

  // 고친 검색어로 쇼핑몰 링크 다시 만들기 (AI 호출 없음)
  shoppingLinks: (query: string, category?: Category | null): Promise<ShoppingResult> =>
    orLocal(
      () => get('/api/shopping/links', { query, category: category ?? undefined }),
      () => localStore.shoppingLinks(query, category),
    ),
};

export { API_MODE, ApiError };
