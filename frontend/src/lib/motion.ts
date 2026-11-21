// 기능: 화면 공통 움직임 값. 디자인 시스템의 시간 & 가속 표와 같은 값

import type { Transition, Variants } from 'framer-motion';

export const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;

// 누름 & 시트: 0.2초
export const QUICK: Transition = { duration: 0.2, ease: EASE_OUT };
// 화면 & 구역 등장: 0.3초
export const ENTER: Transition = { duration: 0.3, ease: EASE_OUT };
// 모디 등장 & 탭 표시 이동
export const SPRING: Transition = { type: 'spring', stiffness: 260, damping: 20 };
export const SNAPPY: Transition = { type: 'spring', stiffness: 500, damping: 40 };

// 아래에서 올라오며 나타남
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: ENTER },
};

// 자식을 0.05초 간격으로 차례로 보여 주는 묶음
export const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
};

export const TAP = { scale: 0.97 };
