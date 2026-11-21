// 기능: 인형에 입힌 옷 상태

import { create } from 'zustand';
import type { Clothing, OutfitSlot } from '../api/types';
import { slotOf } from '../lib/labels';

type Worn = Partial<Record<OutfitSlot, string>>;

interface OutfitState {
  worn: Worn;
  toggle: (item: Clothing) => void;
  replace: (fromId: string, to: Clothing) => void;
  setOutfit: (items: Clothing[]) => void;
  clear: () => void;
}

function put(worn: Worn, item: Clothing): Worn {
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

export const useOutfit = create<OutfitState>((set) => ({
  worn: {},
  toggle: (item) =>
    set((state) => {
      const slot = slotOf(item.category);
      if (!slot) return state;
      if (state.worn[slot] === item.id) {
        const next = { ...state.worn };
        delete next[slot];
        return { worn: next };
      }
      return { worn: put(state.worn, item) };
    }),
  replace: (fromId, to) =>
    set((state) => {
      const next = { ...state.worn };
      (Object.keys(next) as OutfitSlot[]).forEach((slot) => {
        if (next[slot] === fromId) delete next[slot];
      });
      return { worn: put(next, to) };
    }),
  setOutfit: (items) => set({ worn: items.reduce<Worn>((worn, item) => put(worn, item), {}) }),
  clear: () => set({ worn: {} }),
}));

export function wornIds(worn: Worn): string[] {
  return Object.values(worn).filter((id): id is string => Boolean(id));
}
