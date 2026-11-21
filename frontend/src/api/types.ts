// 기능: docs/openapi.yaml 기준 API 타입

export type Category = 'TOP' | 'BOTTOM' | 'OUTER' | 'DRESS' | 'SHOES' | 'ACCESSORY';
export type ItemStatus = 'AVAILABLE' | 'LAUNDRY' | 'DRYING' | 'REPAIR';
export type Tpo = 'DAILY' | 'WORK' | 'FORMAL' | 'DATE' | 'OUTDOOR' | 'EXERCISE';
export type WeatherCondition = 'CLEAR' | 'CLOUDY' | 'FOG' | 'RAIN' | 'SNOW' | 'THUNDER';
export type ThermalFeedback = 'COLD' | 'OK' | 'HOT';
export type OutfitSlot = 'TOP' | 'BOTTOM' | 'DRESS' | 'OUTER' | 'SHOES';

export const COLORS = [
  '블랙', '화이트', '그레이', '네이비', '블루', '베이지', '브라운', '카키',
  '그린', '레드', '핑크', '퍼플', '옐로', '오렌지', '멀티',
] as const;
export type Color = (typeof COLORS)[number];

export const STYLES = ['캐주얼', '미니멀', '포멀', '스포티', '스트릿', '빈티지', '페미닌', '아웃도어'] as const;
export type Style = (typeof STYLES)[number];

export interface ClothingSpec {
  name?: string | null;
  category: Category;
  subType?: string | null;
  colors: Color[];
  warmth: number;
  styles: Style[];
  formality: number;
  washThreshold?: number | null;
}

export interface ClothingCreateRequest extends ClothingSpec {
  imageKey?: string | null;
}

export interface ClothingSuggestion {
  name: string | null;
  category: Category | null;
  subType: string | null;
  colors: Color[];
  warmth: number | null;
  styles: Style[];
  formality: number | null;
  washThreshold: number | null;
  confidence: number;
  lowConfidence: boolean;
  description: string | null;
}

export interface ClothingAnalysisResult {
  imageKey: string;
  imageUrl: string;
  aiAvailable: boolean;
  suggestion: ClothingSuggestion;
}

export interface Clothing {
  id: string;
  name: string | null;
  imageUrl: string | null;
  category: Category;
  subType: string | null;
  colors: Color[];
  warmth: number;
  styles: Style[];
  formality: number;
  status: ItemStatus;
  needsWash: boolean;
  wearsSinceWash: number;
  washThreshold: number;
  dryUntil: string | null;
  lastWornOn: string | null;
}

export interface WearLogRequest {
  date: string;
  itemIds: string[];
  feedback?: ThermalFeedback;
}

export interface WearLog {
  id: string;
  date: string;
  itemIds: string[];
  feedback: ThermalFeedback | null;
  warmthBias: number;
}

export interface CurrentWeather {
  time: string;
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number;
  windSpeed: number;
  condition: WeatherCondition;
}

export interface HourlyWeather {
  time: string;
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number;
  condition: WeatherCondition;
}

export interface DailyWeather {
  date: string;
  condition: WeatherCondition;
  temperatureMin: number;
  temperatureMax: number;
  apparentMin: number;
  apparentMax: number;
  precipitationProbabilityMax: number;
}

export interface WeatherReport {
  latitude: number;
  longitude: number;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
}

export interface EventInput {
  externalId?: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
}

export interface EventAnalysis {
  tpo: Tpo;
  formality: number;
  dressCode: string | null;
  avoidColors: Color[];
  indoor: boolean | null;
  activityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  importance: number;
  confidence: number;
  source: 'AI' | 'RULE' | 'SEED';
  clarifyQuestion: string | null;
}

export interface CalendarEvent {
  id: string;
  externalId: string | null;
  title: string;
  location: string | null;
  startsAt: string;
  endsAt: string;
  analysis: EventAnalysis;
}

export interface MaskPreview {
  title: string;
  location: string | null;
  maskedCount: number;
}

export interface OutfitEntry {
  slot: OutfitSlot;
  item: Clothing;
}

export interface Outfit {
  items: OutfitEntry[];
  warmth: number;
}

export interface DayPlanEvent {
  id: string;
  title: string;
  startsAt: string;
  tpo: Tpo;
}

export interface DayPlan {
  date: string;
  tpo: Tpo;
  events: DayPlanEvent[];
  weather: DailyWeather | null;
  requiredWarmth: number;
  outfit: Outfit | null;
  reason: string;
  layeringTip: string | null;
  warnings: string[];
}

export interface LaundryTask {
  itemIds: string[];
  itemNames: string[];
  deadline: string;
  forDate: string;
  reason: string;
}

export interface WeekPlan {
  startDate: string;
  days: DayPlan[];
  laundryTasks: LaundryTask[];
  conflicts: string[];
  aiAvailable: boolean;
}

export interface EvaluationCheck {
  score: number;
  ok: boolean;
  message: string;
}

export interface EvaluationSuggestion {
  // 옷을 더하라는 제안이면 null
  replaceItemId: string | null;
  // 옷장에 대안이 없으면 null
  withItemId: string | null;
  reason: string;
}

export interface OutfitEvaluation {
  score: number;
  grade: 'GREAT' | 'GOOD' | 'FAIR' | 'POOR';
  checks: {
    weather: EvaluationCheck;
    tpo: EvaluationCheck;
    color: EvaluationCheck;
    laundry: EvaluationCheck;
  };
  summary: string;
  suggestions: EvaluationSuggestion[];
  // 세탁 필요 & 수선 중 등 입기 전에 확인할 사항
  warnings?: string[];
  aiAvailable: boolean;
}

export interface EvaluateRequest {
  itemIds: string[];
  date?: string;
  eventId?: string;
  tpo?: Tpo;
  lat?: number;
  lon?: number;
}

export interface SimilarMatch {
  item: Clothing;
  similarity: number;
  reasons: string[];
}

export interface SimilarCheckResult {
  attributes: ClothingSuggestion;
  verdict: 'DUPLICATE' | 'SIMILAR' | 'NEW';
  matches: SimilarMatch[];
  pairableCount: number;
  comment: string;
}

export type ShoppingMall = 'MUSINSA' | 'ZIGZAG' | 'CM29' | 'WCONCEPT' | 'ELEVENST';
export type SortOrder = 'PRICE_ASC' | 'POPULAR';

export interface MallLink {
  mall: ShoppingMall;
  mallName: string;
  sort: SortOrder;
  // 화면에 그대로 보여 줄 정렬 이름
  sortLabel: string;
  // 해당 쇼핑몰의 검색 결과 주소
  url: string;
}

export interface ShoppingResult {
  // 사진 분석 결과. 검색어로 요청하면 null
  attributes: ClothingSuggestion | null;
  query: string;
  links: MallLink[];
}

// 가성비 제품 찾기(AI 웹 검색) 결과. 아바타 합성 위치: VEST·TOP·OUTER 몸통, BOTTOM 하체, SHOES 발
export type FindCategory = 'TOP' | 'BOTTOM' | 'OUTER' | 'VEST' | 'SHOES';

export interface FindItem {
  name: string;
  // 원, 검색 시점 가격
  price: number;
  mall: string;
  url: string;
  reason: string;
  size: string | null;
  category: FindCategory | null;
  // 상품 페이지 og:image. 서버 요청을 막는 쇼핑몰은 null
  imageUrl: string | null;
  // 배경 제거 이미지. 아직 항상 null
  cutoutUrl: string | null;
}

export interface FindResult {
  analysis: string | null;
  searchQuery: string | null;
  original: { name: string; price: number | null } | null;
  // 0~2개
  items: FindItem[];
  // AI 가 실패해도 채워지는 쇼핑몰 검색 링크
  fallbackLinks: MallLink[];
  aiAvailable: boolean;
  warnings: string[];
  elapsedMs: number;
}

// 응답 출처 표시용. 화면에서 데모 계산 여부 안내
export type Sourced<T> = { data: T; source: 'server' | 'local' };
