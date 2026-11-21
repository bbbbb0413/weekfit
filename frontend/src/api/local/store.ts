// 기능: 브라우저 저장소 기반 데모 백엔드 (localStorage)

import type {
  CalendarEvent,
  Category,
  Clothing,
  ClothingAnalysisResult,
  ClothingCreateRequest,
  ClothingSpec,
  EventInput,
  ItemStatus,
  ShoppingResult,
  SimilarCheckResult,
  WearLog,
  WearLogRequest,
  WeatherCondition,
  WeatherReport,
} from '../types';
import { today } from '../../lib/date';
import { analyzeEvent, maskText } from './engine';
import { sampleWeather, seedCloset, seedEvents } from './seed';
import { buildMallLinks, sanitizeQuery } from './shopping';

const KEY = 'weekfit.local.v1';

interface State {
  seededOn: string;
  clothes: Clothing[];
  events: CalendarEvent[];
  wearLogs: WearLog[];
  warmthBias: number;
  images: Record<string, string>;
}

function fresh(): State {
  const start = today();
  return { seededOn: start, clothes: seedCloset(), events: seedEvents(start), wearLogs: [], warmthBias: 0, images: {} };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const state = JSON.parse(raw) as State;
      // 날짜가 바뀌면 데모 일정을 오늘 기준으로 다시 깔기
      if (state.seededOn !== today()) {
        state.events = [...state.events.filter((e) => !e.id.startsWith('local-event-')), ...seedEvents(today())];
        state.seededOn = today();
        save(state);
      }
      return state;
    }
  } catch {
    // 저장소를 못 쓰는 환경이면 메모리 상태로만 동작
  }
  const state = fresh();
  save(state);
  return state;
}

function save(state: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 용량 초과 등은 무시
  }
}

let state: State | null = null;
function db(): State {
  if (!state) state = load();
  return state;
}

function commit() {
  if (state) save(state);
}

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`;
}

// 건조 시간이 지난 옷은 입을 수 있음으로 표시
function effective(item: Clothing): Clothing {
  if (item.status === 'DRYING' && item.dryUntil && new Date(item.dryUntil) <= new Date()) {
    return { ...item, status: 'AVAILABLE', dryUntil: null };
  }
  return item;
}

const WASH_THRESHOLD = { TOP: 2, BOTTOM: 5, OUTER: 15, DRESS: 2, SHOES: 30, ACCESSORY: 30 } as const;

export const localStore = {
  reset() {
    state = fresh();
    commit();
  },

  warmthBias(): number {
    return db().warmthBias;
  },

  listClothes(): Clothing[] {
    return db().clothes.map(effective);
  },

  async analyze(file: File): Promise<ClothingAnalysisResult> {
    const dataUrl = await shrink(file);
    const imageKey = `local-${uid()}`;
    db().images[imageKey] = dataUrl;
    commit();
    return {
      imageKey,
      imageUrl: dataUrl,
      aiAvailable: false,
      suggestion: {
        name: null,
        category: null,
        subType: null,
        colors: [],
        warmth: null,
        styles: [],
        formality: null,
        washThreshold: null,
        confidence: 0,
        lowConfidence: true,
        description: null,
      },
    };
  },

  createClothing(request: ClothingCreateRequest): Clothing {
    const washThreshold = request.washThreshold ?? WASH_THRESHOLD[request.category];
    const item: Clothing = {
      id: uid(),
      name: request.name ?? null,
      imageUrl: request.imageKey ? (db().images[request.imageKey] ?? null) : null,
      category: request.category,
      subType: request.subType ?? null,
      colors: request.colors,
      warmth: request.warmth,
      styles: request.styles,
      formality: request.formality,
      status: 'AVAILABLE',
      needsWash: false,
      wearsSinceWash: 0,
      washThreshold,
      dryUntil: null,
      lastWornOn: null,
    };
    db().clothes.push(item);
    commit();
    return item;
  },

  updateClothing(id: string, spec: ClothingSpec): Clothing {
    const item = find(id);
    Object.assign(item, {
      name: spec.name ?? null,
      category: spec.category,
      subType: spec.subType ?? null,
      colors: spec.colors,
      warmth: spec.warmth,
      styles: spec.styles,
      formality: spec.formality,
      washThreshold: spec.washThreshold ?? item.washThreshold,
    });
    item.needsWash = item.wearsSinceWash >= item.washThreshold;
    commit();
    return effective(item);
  },

  deleteClothing(id: string) {
    db().clothes = db().clothes.filter((c) => c.id !== id);
    commit();
  },

  changeStatus(id: string, status: Exclude<ItemStatus, 'DRYING'>): Clothing {
    const item = find(id);
    item.status = status;
    item.dryUntil = null;
    commit();
    return effective(item);
  },

  startLaundry(itemIds: string[], dryHours?: number): Clothing[] {
    const now = Date.now();
    const changed = itemIds.map((id) => {
      const item = find(id);
      const hours = dryHours ?? (item.category === 'OUTER' ? 48 : 24);
      item.status = 'DRYING';
      item.dryUntil = new Date(now + hours * 3600_000).toISOString();
      item.wearsSinceWash = 0;
      item.needsWash = false;
      return effective(item);
    });
    commit();
    return changed;
  },

  recordWear(request: WearLogRequest): WearLog {
    request.itemIds.forEach((id) => {
      const item = find(id);
      item.wearsSinceWash += 1;
      item.needsWash = item.wearsSinceWash >= item.washThreshold;
      item.lastWornOn = request.date;
    });
    if (request.feedback === 'COLD') db().warmthBias = Math.min(2, db().warmthBias + 1);
    if (request.feedback === 'HOT') db().warmthBias = Math.max(-2, db().warmthBias - 1);
    const log: WearLog = {
      id: uid(),
      date: request.date,
      itemIds: request.itemIds,
      feedback: request.feedback ?? null,
      warmthBias: db().warmthBias,
    };
    db().wearLogs.push(log);
    commit();
    return log;
  },

  listWearLogs(from: string, to: string): WearLog[] {
    return db().wearLogs.filter((log) => log.date >= from && log.date <= to);
  },

  // 기간 안의 기존 일정을 가져온 일정으로 바꿈
  syncEvents(from: string, to: string, inputs: EventInput[]): CalendarEvent[] {
    db().events = db().events.filter((e) => e.startsAt.slice(0, 10) < from || e.startsAt.slice(0, 10) > to);
    inputs.forEach((input) => this.createEvent(input));
    return this.listEvents(from, to);
  },

  listEvents(from: string, to: string): CalendarEvent[] {
    return db()
      .events.filter((e) => e.startsAt.slice(0, 10) >= from && e.startsAt.slice(0, 10) <= to)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  },

  createEvent(input: EventInput): CalendarEvent {
    const masked = maskText(input.title, input.location);
    const event: CalendarEvent = {
      id: uid(),
      externalId: input.externalId ?? null,
      title: masked.title,
      location: masked.location,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      analysis: analyzeEvent(input.title),
    };
    db().events.push(event);
    commit();
    return event;
  },

  deleteEvent(id: string) {
    db().events = db().events.filter((e) => e.id !== id);
    commit();
  },

  async weather(where?: { lat: number; lon: number } | null): Promise<WeatherReport> {
    let report: WeatherReport;
    try {
      report = await openMeteo(where?.lat ?? 37.5665, where?.lon ?? 126.978);
    } catch {
      report = sampleWeather(today());
    }
    return demoCondition ? withScenario(report, demoCondition) : report;
  },

  demoWeather(): WeatherCondition | null {
    return demoCondition;
  },

  setDemoWeather(condition: WeatherCondition | null) {
    demoCondition = condition;
  },

  // 사진 분석은 AI 가 필요해 데모에서는 옷장 기반 예시 결과만 제공
  similarSample(): SimilarCheckResult {
    const closet = this.listClothes();
    const target = closet.find((c) => c.subType === '셔츠' && c.colors[0] === '네이비') ?? closet[0];
    const matches = closet
      .filter((c) => c.category === target.category)
      .map((c) => {
        const reasons: string[] = [];
        let similarity = 0.2;
        if (c.subType === target.subType) (similarity += 0.4), reasons.push(`같은 ${c.subType}`);
        if (c.colors[0] === target.colors[0]) (similarity += 0.3), reasons.push(`색 일치: ${c.colors[0]}`);
        if (Math.abs(c.formality - target.formality) <= 1) (similarity += 0.1), reasons.push('비슷한 격식');
        return { item: c, similarity: Math.min(0.97, similarity), reasons };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
    return {
      attributes: {
        name: '네이비 셔츠',
        category: 'TOP',
        subType: '셔츠',
        colors: ['네이비'],
        warmth: 2,
        styles: ['포멀'],
        formality: 4,
        washThreshold: null,
        confidence: 0.9,
        lowConfidence: false,
        description: '기본 핏 네이비 셔츠',
      },
      verdict: 'DUPLICATE',
      matches,
      pairableCount: closet.filter((c) => c.category === 'BOTTOM' || c.category === 'OUTER').length,
      comment: '옷장에 거의 같은 네이비 셔츠가 있어요. 새로 사기보다 가진 옷을 먼저 활용해 보세요.',
    };
  },

  // 데모에서는 사진을 분석하지 못해 예시 검색어로 링크 생성
  shoppingSample(): ShoppingResult {
    const query = '네이비 울 롱코트';
    return {
      attributes: {
        name: '네이비 울 코트',
        category: 'OUTER',
        subType: '코트',
        colors: ['네이비'],
        warmth: 4,
        styles: ['포멀'],
        formality: 4,
        washThreshold: null,
        confidence: 0.9,
        lowConfidence: false,
        description: '무릎 아래 길이의 네이비 울 코트',
      },
      query,
      links: buildMallLinks(query, 'OUTER'),
    };
  },

  shoppingLinks(query: string, category?: Category | null): ShoppingResult {
    const cleaned = sanitizeQuery(query);
    if (!cleaned) throw new Error('검색어를 입력해 주세요.');
    return { attributes: null, query: cleaned, links: buildMallLinks(cleaned, category) };
  },
};

function find(id: string): Clothing {
  const item = db().clothes.find((c) => c.id === id);
  if (!item) throw new Error('옷을 찾을 수 없습니다.');
  return item;
}

// 사진을 저장소에 넣을 수 있게 긴 변 480px JPEG 로 축소
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 480 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽지 못했어요.'));
    };
    image.src = url;
  });
}

function fromWmo(code: number | null | undefined): WeatherCondition {
  if (code == null) return 'CLOUDY';
  if (code === 0 || code === 1) return 'CLEAR';
  if (code === 2 || code === 3) return 'CLOUDY';
  if (code === 45 || code === 48) return 'FOG';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'SNOW';
  if (code >= 95) return 'THUNDER';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'RAIN';
  return 'CLOUDY';
}

// 데모 모드에서 서울 예보 직접 조회. 실패하면 예시 예보 사용
async function openMeteo(lat: number, lon: number): Promise<WeatherReport> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m',
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,weather_code',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max',
    timezone: 'Asia/Seoul',
    forecast_days: '7',
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal });
  clearTimeout(timer);
  if (!response.ok) throw new Error('weather');
  const json = await response.json();
  const hourlyAll = (json.hourly.time as string[]).map((time, i) => ({
    time: `${time}:00+09:00`,
    temperature: json.hourly.temperature_2m[i] as number,
    apparentTemperature: json.hourly.apparent_temperature[i] as number,
    precipitationProbability: (json.hourly.precipitation_probability[i] as number) ?? 0,
    condition: fromWmo(json.hourly.weather_code[i]),
  }));
  const nowIndex = Math.max(0, hourlyAll.findIndex((h) => new Date(h.time) >= new Date(Date.now() - 3600_000)));
  const hourly = hourlyAll.slice(nowIndex, nowIndex + 24);
  return {
    latitude: json.latitude,
    longitude: json.longitude,
    current: {
      time: `${json.current.time}:00+09:00`,
      temperature: json.current.temperature_2m,
      apparentTemperature: json.current.apparent_temperature,
      precipitationProbability: hourly[0]?.precipitationProbability ?? 0,
      windSpeed: json.current.wind_speed_10m,
      condition: fromWmo(json.current.weather_code),
    },
    hourly,
    daily: (json.daily.time as string[]).map((date, i) => ({
      date,
      condition: fromWmo(json.daily.weather_code[i]),
      temperatureMin: json.daily.temperature_2m_min[i],
      temperatureMax: json.daily.temperature_2m_max[i],
      apparentMin: json.daily.apparent_temperature_min[i],
      apparentMax: json.daily.apparent_temperature_max[i],
      precipitationProbabilityMax: json.daily.precipitation_probability_max[i] ?? 0,
    })),
  };
}

// 데모용 날씨 미리보기. 새로고침하면 실제 날씨로 복귀
let demoCondition: WeatherCondition | null = null;

const SCENARIO: Record<WeatherCondition, { temperature: number; apparent: number; rain: number }> = {
  CLEAR: { temperature: 24, apparent: 25, rain: 0 },
  CLOUDY: { temperature: 17, apparent: 16, rain: 20 },
  RAIN: { temperature: 13, apparent: 11, rain: 80 },
  SNOW: { temperature: -2, apparent: -6, rain: 70 },
  FOG: { temperature: 9, apparent: 8, rain: 10 },
  THUNDER: { temperature: 21, apparent: 22, rain: 90 },
};

function withScenario(report: WeatherReport, condition: WeatherCondition): WeatherReport {
  const scene = SCENARIO[condition];
  const shift = scene.temperature - report.current.temperature;
  return {
    ...report,
    current: {
      ...report.current,
      condition,
      temperature: scene.temperature,
      apparentTemperature: scene.apparent,
      precipitationProbability: scene.rain,
    },
    hourly: report.hourly.map((h) => ({
      ...h,
      condition,
      temperature: Math.round((h.temperature + shift) * 10) / 10,
      apparentTemperature: Math.round((h.apparentTemperature + shift + (scene.apparent - scene.temperature)) * 10) / 10,
      precipitationProbability: scene.rain,
    })),
    daily: report.daily.map((d, i) =>
      i === 0
        ? {
            ...d,
            condition,
            temperatureMin: scene.temperature - 4,
            temperatureMax: scene.temperature + 2,
            apparentMin: scene.apparent - 4,
            apparentMax: scene.apparent + 2,
            precipitationProbabilityMax: scene.rain,
          }
        : d,
    ),
  };
}
