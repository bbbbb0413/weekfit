// 기능: 3D 방 치수 & 날씨별 색 (단위는 대략 미터)

import * as THREE from 'three';
import type { WeatherCondition } from '../../api/types';

export const ROOM = {
  halfWidth: 2.6,
  height: 3.4,
  back: -2,
  front: 6,
};

export const WINDOW = {
  left: -2.35,
  right: -0.3,
  bottom: 0.35,
  top: 2.78,
};

export const DOLL = {
  x: 0.35,
  z: 1.45,
  // 인형 좌표 1 단위의 실제 길이 (키 400 단위 = 1.9)
  unit: 1.9 / 400,
};

export const INK = '#3b302d';

interface Mood {
  sky: string;
  skyline: string;
  skylineFar: string;
  // 방 안이 어두워지는 정도
  dim: number;
}

export const MOOD: Record<WeatherCondition, Mood> = {
  CLEAR: { sky: '#7cc4ff', skyline: '#5aa7e6', skylineFar: '#6bb6f2', dim: 0 },
  CLOUDY: { sky: '#b9c6d3', skyline: '#93a4b6', skylineFar: '#a6b5c4', dim: 0.05 },
  FOG: { sky: '#cfd6d4', skyline: '#b9c2c0', skylineFar: '#c5cdcb', dim: 0.05 },
  RAIN: { sky: '#7f96b2', skyline: '#61789a', skylineFar: '#7087a6', dim: 0.1 },
  SNOW: { sky: '#c9dbec', skyline: '#a3bbd3', skylineFar: '#b6cbe0', dim: 0.02 },
  THUNDER: { sky: '#4e5a78', skyline: '#39445f', skylineFar: '#444f6c', dim: 0.2 },
};

const ink = new THREE.Color(INK);

export function dimmed(hex: string, amount: number): THREE.Color {
  return new THREE.Color(hex).lerp(ink, amount);
}

// 매번 같은 배치가 나오는 난수
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 창밖으로 보이는 범위
export const OUTSIDE = {
  xMin: -5.6,
  xMax: 1.4,
  yMin: -0.4,
  yMax: 4.4,
  zNear: -2.3,
  zFar: -5.6,
};
