// 기능: enum 한글 표기 & 색상 값

import type { Category, Color, ItemStatus, OutfitSlot, Tpo, WeatherCondition } from '../api/types';

export const CATEGORY_LABEL: Record<Category, string> = {
  TOP: '상의',
  BOTTOM: '하의',
  OUTER: '아우터',
  DRESS: '원피스',
  SHOES: '신발',
  ACCESSORY: '액세서리',
};

export const STATUS_LABEL: Record<ItemStatus, string> = {
  AVAILABLE: '입을 수 있음',
  LAUNDRY: '세탁 대기',
  DRYING: '건조 중',
  REPAIR: '수선 중',
};

export const TPO_LABEL: Record<Tpo, string> = {
  DAILY: '일상',
  WORK: '출근',
  FORMAL: '격식',
  DATE: '데이트',
  OUTDOOR: '야외활동',
  EXERCISE: '운동',
};

export const CONDITION_LABEL: Record<WeatherCondition, string> = {
  CLEAR: '맑음',
  CLOUDY: '흐림',
  FOG: '안개',
  RAIN: '비',
  SNOW: '눈',
  THUNDER: '뇌우',
};

export const SLOT_LABEL: Record<OutfitSlot, string> = {
  TOP: '상의',
  BOTTOM: '하의',
  DRESS: '원피스',
  OUTER: '아우터',
  SHOES: '신발',
};

export const WARMTH_LABEL = ['', '매우 얇음', '얇음', '보통', '따뜻함', '매우 따뜻함'];
export const FORMALITY_LABEL = ['', '운동복', '편한 차림', '단정한 캐주얼', '세미 정장', '정장'];

// 옷 그림에 칠할 색. 화면 장식 색과 섞이지 않게 채도 낮춤
export const COLOR_HEX: Record<Color, string> = {
  블랙: '#2B2D33',
  화이트: '#FDFDFB',
  그레이: '#A9AEB6',
  네이비: '#2A3A66',
  블루: '#7FA8D6',
  베이지: '#DCC8A6',
  브라운: '#8A5E3C',
  카키: '#7C8257',
  그린: '#3F8F63',
  레드: '#C8443A',
  핑크: '#F0A8B8',
  퍼플: '#8C6BB8',
  옐로: '#F1C94B',
  오렌지: '#E88A3A',
  멀티: '#C9B7E0',
};

export function slotOf(category: Category): OutfitSlot | null {
  return category === 'ACCESSORY' ? null : category;
}

export function itemLabel(item: { name: string | null; subType: string | null; category: Category }): string {
  return item.name ?? item.subType ?? CATEGORY_LABEL[item.category];
}
