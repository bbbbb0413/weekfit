// 기능: 살까 말까 화면의 입력과 결과를 화면 밖에 보관. 다른 탭을 다녀와도 사진, 검사 결과, 찾은 제품이 남음
// 사진으로·글로 찾기는 칸을 따로 둬서, 둘 사이를 오가도 각자 보던 결과가 남음
// 탭을 떠난 사이 도착한 응답도 요청을 보낸 칸에 저장되어 돌아오면 바로 보임. 메모리에만 두므로 새로고침하면 비워짐

import { useCallback } from 'react';
import { create } from 'zustand';
import type { FindItem, MallLink, SimilarCheckResult, Sourced } from '../api/types';
import type { FindState } from '../components/FindCards';

export type BuyMode = 'photo' | 'text';

export interface BuySlice {
  file: File | null;
  check: Sourced<SimilarCheckResult> | null;
  checking: boolean;
  error: string | null;
  find: FindState;
  chosen: FindItem | null;
  query: string;
  linkedQuery: string;
  links: MallLink[];
  linkError: string | null;
  text: string;
}

interface BuyState {
  mode: BuyMode;
  slices: Record<BuyMode, BuySlice>;
}

const EMPTY: BuySlice = {
  file: null,
  check: null,
  checking: false,
  error: null,
  find: { kind: 'idle' },
  chosen: null,
  query: '',
  linkedQuery: '',
  links: [],
  linkError: null,
  text: '',
};

const useBuyStore = create<BuyState>(() => ({ mode: 'photo', slices: { photo: EMPTY, text: EMPTY } }));

// 사진을 바꾼 뒤 늦게 도착한 이전 응답을 버리기 위한 요청 번호. 칸마다 따로 두고, 화면을 다시 열어도 이어지게 밖에 둠
export const buyRequestIds: Record<BuyMode, { current: number }> = { photo: { current: 0 }, text: { current: 0 } };

export function useBuyMode(): [BuyMode, (next: BuyMode) => void] {
  const mode = useBuyStore((s) => s.mode);
  const set = useCallback((next: BuyMode) => useBuyStore.setState({ mode: next }), []);
  return [mode, set];
}

type Update<T> = T | ((current: T) => T);

// useState 와 같은 모양으로 한 칸(mode)의 값 하나를 읽고 씀. 돌려받은 setter 는 그 칸에 고정됨
export function useBuyField<K extends keyof BuySlice>(mode: BuyMode, key: K): [BuySlice[K], (next: Update<BuySlice[K]>) => void] {
  const value = useBuyStore((s) => s.slices[mode][key]);
  const set = useCallback(
    (next: Update<BuySlice[K]>) =>
      useBuyStore.setState((s) => {
        const slice = s.slices[mode];
        const value = typeof next === 'function' ? (next as (current: BuySlice[K]) => BuySlice[K])(slice[key]) : next;
        return { slices: { ...s.slices, [mode]: { ...slice, [key]: value } } };
      }),
    [mode, key],
  );
  return [value, set];
}
