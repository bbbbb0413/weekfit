// 기능: 오늘 코디 보드에 올린 옷 & 착용 기록 여부

import { create } from 'zustand';
import type { Clothing, OutfitSlot } from '../api/types';
import { slotOf } from '../lib/labels';

export type Worn = Partial<Record<OutfitSlot, string>>;

const WORN_KEY = 'modi.wornOn';

interface OutfitState {
  worn: Worn;
  // 추천 코디에서 직접 바꾼 상태
  custom: boolean;
  // 착용을 기록한 날짜
  wornOn: string | null;
  put: (item: Clothing) => void;
  remove: (slot: OutfitSlot) => void;
  follow: (items: Clothing[]) => void;
  markWorn: (date: string) => void;
  clearWorn: () => void;
}

function place(worn: Worn, item: Clothing): Worn {
  const slot = slotOf(item.category);
  if (!slot) return worn;
  const next: Worn = { ...worn, [slot]: item.id };
  // 원피스는 상의 & 하의와 함께 입지 않음
  if (slot === 'DRESS') {
    delete next.TOP;
    delete next.BOTTOM;
  }
  if (slot === 'TOP' || slot === 'BOTTOM') delete next.DRESS;
  return next;
}

function readWornOn(): string | null {
  try {
    return localStorage.getItem(WORN_KEY);
  } catch {
    return null;
  }
}

export const useOutfit = create<OutfitState>((set) => ({
  worn: {},
  custom: false,
  wornOn: readWornOn(),
  put: (item) => set((state) => ({ worn: place(state.worn, item), custom: true })),
  remove: (slot) =>
    set((state) => {
      const next = { ...state.worn };
      delete next[slot];
      return { worn: next, custom: true };
    }),
  follow: (items) => set({ worn: items.reduce<Worn>(place, {}), custom: false }),
  markWorn: (date) => {
    try {
      localStorage.setItem(WORN_KEY, date);
    } catch {
      // 저장소를 못 쓰는 환경에서는 이번 방문 동안만 유지
    }
    // 기록한 뒤 추천이 다시 계산돼도 입은 옷이 보드에 남도록 고정
    set({ wornOn: date, custom: true });
  },
  // 기록 취소: 다시 오늘 추천 코디를 따라가게 함
  clearWorn: () => {
    try {
      localStorage.removeItem(WORN_KEY);
    } catch {
      // 저장소를 못 쓰는 환경
    }
    set({ wornOn: null, custom: false });
  },
}));

export function wornIds(worn: Worn): string[] {
  return Object.values(worn).filter((id): id is string => Boolean(id));
}
