// 기능: 살까 말까 화면의 입력과 결과를 화면 밖에 보관. 다른 탭을 다녀와도 사진, 검사 결과, 찾은 제품이 남음
// 탭을 떠난 사이 도착한 응답도 여기 저장되어 돌아오면 바로 보임. 메모리에만 두므로 새로고침하면 비워짐

import { useCallback } from 'react';
import { create } from 'zustand';
import type { FindItem, MallLink, SimilarCheckResult, Sourced } from '../api/types';
import type { FindState } from '../components/FindCards';

export type BuyMode = 'photo' | 'text';

export interface BuyState {
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
  mode: BuyMode;
}

const INITIAL: BuyState = {
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
  mode: 'photo',
};

export const useBuyStore = create<BuyState>(() => INITIAL);

// 사진을 바꾼 뒤 늦게 도착한 이전 응답을 버리기 위한 요청 번호. 화면을 다시 열어도 이어져야 해서 밖에 둠
export const buyRequestId = { current: 0 };

type Update<T> = T | ((current: T) => T);

// useState 와 같은 모양으로 저장소의 한 칸을 읽고 씀
export function useBuyField<K extends keyof BuyState>(key: K): [BuyState[K], (next: Update<BuyState[K]>) => void] {
  const value = useBuyStore((s) => s[key]);
  const set = useCallback(
    (next: Update<BuyState[K]>) =>
      useBuyStore.setState(
        (s) =>
          ({
            [key]: typeof next === 'function' ? (next as (current: BuyState[K]) => BuyState[K])(s[key]) : next,
          }) as Pick<BuyState, K>,
      ),
    [key],
  );
  return [value, set];
}
