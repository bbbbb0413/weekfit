// 기능: 브라우저별 사용자 ID & 날씨 기준 위치 보관

const USER_KEY = 'modi.userId';
const PLACE_KEY = 'modi.place';

export interface Place {
  lat: number;
  lon: number;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // 저장소를 못 쓰면 이번 방문 동안만 유지
  }
}

let memoryId: string | null = null;

// 브라우저마다 한 번 만들어 계속 쓰는 사용자 UUID
export function userId(): string {
  const saved = read(USER_KEY) ?? memoryId;
  if (saved) return saved;
  const created =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
  memoryId = created;
  write(USER_KEY, created);
  return created;
}

// 사용자가 허용한 위치. 없으면 서버 기본값(서울)
export function place(): Place | null {
  const raw = read(PLACE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Place;
    return typeof value.lat === 'number' && typeof value.lon === 'number' ? value : null;
  } catch {
    return null;
  }
}

export function setPlace(value: Place | null) {
  // 소수 둘째 자리(약 1km)까지만 보관
  write(PLACE_KEY, value ? JSON.stringify({ lat: Math.round(value.lat * 100) / 100, lon: Math.round(value.lon * 100) / 100 }) : null);
}
