// 기능: 무료 서버가 잠들었다 깨어나는 동안을 알아채 화면에 안내하도록 상태를 모음
// 첫 응답을 받기 전에 오래 걸리는 요청은 서버가 깨어나는 중으로 본다. 첫 응답 뒤의 느린 요청은 AI 처리 시간이라 제외함

import { create } from 'zustand';

const SLOW_MS = 4_000;

interface WakeState {
  awake: boolean;
  waiting: number;
}

export const useServerWake = create<WakeState>(() => ({ awake: false, waiting: 0 }));

export const isWaking = (s: WakeState) => !s.awake && s.waiting > 0;

// 요청을 시작할 때 부르고, 끝나면 돌려받은 함수를 부름
export function watchSlow(): () => void {
  if (useServerWake.getState().awake) return () => {};
  let counted = false;
  const timer = setTimeout(() => {
    if (useServerWake.getState().awake) return;
    counted = true;
    useServerWake.setState((s) => ({ waiting: s.waiting + 1 }));
  }, SLOW_MS);
  return () => {
    clearTimeout(timer);
    if (counted) useServerWake.setState((s) => ({ waiting: Math.max(0, s.waiting - 1) }));
  };
}

export function markAwake() {
  if (!useServerWake.getState().awake) useServerWake.setState({ awake: true });
}
