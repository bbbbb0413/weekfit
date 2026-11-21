// 기능: 화면에서 쓰는 API 함수. mock 모드는 브라우저 데모 데이터, real 모드는 백엔드 호출

import { API_MODE, ApiError, get, send, upload } from './client';
import { analyzeEvent, evaluateOutfit, maskText, planWeek } from './local/engine';
import { localStore } from './local/store';
import type {
  CalendarEvent,
  Category,
  Clothing,
  ClothingAnalysisResult,
  ClothingCreateRequest,
  ClothingSpec,
  EvaluateRequest,
  EventInput,
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

const mock = API_MODE === 'mock';

// 백엔드에 아직 없는 엔드포인트면 대체 계산으로 전환
async function orLocal<T>(remote: () => Promise<T>, local: () => T | Promise<T>): Promise<T> {
  if (mock) return local();
  try {
    return await remote();
  } catch (error) {
    if (error instanceof ApiError && error.notReady) return local();
    throw error;
  }
}

export const api = {
  // ---------- 옷장 ----------
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

  // ---------- 날씨 ----------
  weather: (): Promise<WeatherReport> => (mock ? localStore.weather() : get('/api/weather')),
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

  maskPreview: (title: string, location?: string): Promise<MaskPreview> =>
    orLocal(
      () => send('POST', '/api/events/mask-preview', { title, location }),
      () => maskText(title, location),
    ),

  // ---------- 추천 & 평가 ----------
  weekPlan: (start: string): Promise<WeekPlan> =>
    orLocal(
      () => get('/api/plans/week', { start }),
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

  evaluate: (body: EvaluateRequest): Promise<OutfitEvaluation> =>
    orLocal(
      () => send('POST', '/api/outfits/evaluate', body),
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

  // 고친 검색어로 쇼핑몰 링크 다시 만들기 (AI 호출 없음)
  shoppingLinks: (query: string, category?: Category | null): Promise<ShoppingResult> =>
    orLocal(
      () => get('/api/shopping/links', { query, category: category ?? undefined }),
      () => localStore.shoppingLinks(query, category),
    ),
};

export { API_MODE, ApiError };
