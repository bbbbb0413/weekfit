// 기능: 데모 데이터. 옷장은 백엔드 DemoClosetSeed 와 같은 17벌

import type { CalendarEvent, Category, Clothing, Color, DailyWeather, ItemStatus, Style, WeatherCondition, WeatherReport } from '../types';
import { addDays, toLocalIso } from '../../lib/date';
import { analyzeEvent } from './engine';

const WASH_THRESHOLD: Record<Category, number> = { TOP: 2, BOTTOM: 5, OUTER: 15, DRESS: 2, SHOES: 30, ACCESSORY: 30 };

function item(
  slug: string,
  name: string,
  category: Category,
  subType: string,
  colors: Color[],
  warmth: number,
  styles: Style[],
  formality: number,
  wears: number,
  status: ItemStatus = 'AVAILABLE',
): Clothing {
  const washThreshold = WASH_THRESHOLD[category];
  return {
    id: `local-${slug}`,
    name,
    imageUrl: null,
    category,
    subType,
    colors,
    warmth,
    styles,
    formality,
    status,
    needsWash: wears >= washThreshold,
    wearsSinceWash: wears,
    washThreshold,
    dryUntil: null,
    lastWornOn: null,
  };
}

export function seedCloset(): Clothing[] {
  return [
    item('white-oxford-shirt', '화이트 옥스포드 셔츠', 'TOP', '셔츠', ['화이트'], 2, ['미니멀', '포멀'], 4, 0),
    item('navy-shirt', '네이비 셔츠', 'TOP', '셔츠', ['네이비'], 2, ['포멀'], 4, 2),
    item('gray-sweatshirt', '그레이 맨투맨', 'TOP', '맨투맨', ['그레이'], 3, ['캐주얼'], 2, 1, 'LAUNDRY'),
    item('black-knit', '블랙 라운드 니트', 'TOP', '니트', ['블랙'], 4, ['미니멀'], 3, 1),
    item('beige-tshirt', '베이지 반팔 티셔츠', 'TOP', '반팔티', ['베이지'], 1, ['캐주얼'], 2, 0),
    item('stripe-longsleeve', '스트라이프 긴팔 티셔츠', 'TOP', '긴팔티', ['화이트', '네이비'], 2, ['캐주얼'], 2, 0),
    item('black-slacks', '블랙 슬랙스', 'BOTTOM', '슬랙스', ['블랙'], 3, ['포멀', '미니멀'], 4, 2),
    item('light-jeans', '연청 청바지', 'BOTTOM', '청바지', ['블루'], 3, ['캐주얼'], 2, 3),
    item('beige-chinos', '베이지 치노 팬츠', 'BOTTOM', '치노', ['베이지'], 3, ['캐주얼', '미니멀'], 3, 1),
    item('gray-joggers', '그레이 트레이닝 팬츠', 'BOTTOM', '트레이닝팬츠', ['그레이'], 2, ['스포티'], 1, 0),
    item('navy-wool-coat', '네이비 울 코트', 'OUTER', '코트', ['네이비'], 5, ['포멀', '미니멀'], 4, 3),
    item('khaki-windbreaker', '카키 바람막이', 'OUTER', '바람막이', ['카키'], 2, ['아웃도어', '스포티'], 2, 0),
    item('gray-cardigan', '그레이 가디건', 'OUTER', '가디건', ['그레이'], 3, ['미니멀'], 3, 1),
    item('black-padding', '블랙 숏패딩', 'OUTER', '패딩', ['블랙'], 5, ['캐주얼'], 2, 2),
    item('white-sneakers', '화이트 스니커즈', 'SHOES', '운동화', ['화이트'], 2, ['캐주얼'], 2, 4),
    item('black-derby', '블랙 더비 슈즈', 'SHOES', '구두', ['블랙'], 2, ['포멀'], 5, 0),
    item('trekking-shoes', '트레킹화', 'SHOES', '등산화', ['그레이'], 3, ['아웃도어'], 1, 0),
  ];
}

export function seedEvents(start: string): CalendarEvent[] {
  const rows: Array<[number, string, string, string, string | null]> = [
    [0, '대학 동기 결혼식', '14:00', '16:00', '더채플 청담'],
    [1, '북한산 등산', '09:00', '13:00', '북한산 우이역'],
    [2, '주간 회의', '10:00', '11:00', null],
    [3, '필라테스', '20:00', '21:00', null],
    [4, '신입 교육 발표', '10:00', '12:00', '본사 대회의실'],
    [6, '소개팅', '19:00', '21:00', '성수동'],
  ];
  return rows.map(([offset, title, from, to, location], index) => {
    const date = addDays(start, offset);
    return {
      id: `local-event-${index}`,
      externalId: null,
      title,
      location,
      startsAt: toLocalIso(date, from),
      endsAt: toLocalIso(date, to),
      analysis: { ...analyzeEvent(title), source: 'SEED' },
    };
  });
}

// Open-Meteo 를 못 부를 때 쓰는 예시 예보 (11월 하순 서울 가정)
export function sampleWeather(start: string): WeatherReport {
  const pattern: Array<[WeatherCondition, number, number, number]> = [
    ['RAIN', 4, 9, 70],
    ['CLOUDY', 2, 10, 20],
    ['CLEAR', 0, 11, 0],
    ['CLEAR', 1, 12, 0],
    ['CLOUDY', 3, 9, 30],
    ['SNOW', -3, 2, 60],
    ['CLEAR', -2, 5, 10],
  ];
  const daily: DailyWeather[] = pattern.map(([condition, min, max, rain], i) => ({
    date: addDays(start, i),
    condition,
    temperatureMin: min,
    temperatureMax: max,
    apparentMin: min - 2,
    apparentMax: max - 1,
    precipitationProbabilityMax: rain,
  }));
  const now = new Date();
  const hourly = Array.from({ length: 24 }, (_, i) => {
    const time = new Date(now.getTime() + i * 3600_000);
    const temperature = 6 + Math.round(3 * Math.sin(((time.getHours() - 9) / 24) * Math.PI * 2));
    return {
      time: time.toISOString(),
      temperature,
      apparentTemperature: temperature - 2,
      precipitationProbability: 70,
      condition: 'RAIN' as WeatherCondition,
    };
  });
  return {
    latitude: 37.5665,
    longitude: 126.978,
    current: {
      time: now.toISOString(),
      temperature: hourly[0].temperature,
      apparentTemperature: hourly[0].apparentTemperature,
      precipitationProbability: 70,
      windSpeed: 14,
      condition: 'RAIN',
    },
    hourly,
    daily,
  };
}
