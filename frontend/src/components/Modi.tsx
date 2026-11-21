// 기능: 모디 캐릭터. 포즈별 몸, 효과, 그림자 층을 겹치고 framer-motion 으로 움직임

import { m, useReducedMotion, type TargetAndTransition } from 'framer-motion';

export type ModiPose = 'hello' | 'pick' | 'think' | 'rain' | 'cold' | 'cheer' | 'sorry' | 'empty';

const files = import.meta.glob<string>('../assets/modi/*.webp', { eager: true, query: '?url', import: 'default' });
const src = (name: string) => files[`../assets/modi/${name}.webp`];

// 원본 그림 높이. 모든 포즈가 발 높이와 키를 맞춰 같은 높이로 잘려 있음
const SHEET_H = 378;
const SHADOW_W = 236;
const SHADOW_H = 22;

interface Sheet {
  // 원본 그림 폭
  w: number;
  // 몸 위에 겹치는 효과 그림 수 (반짝임, 점, 빗방울 등)
  fx: number;
  // 발 중심 x, 발바닥 y
  foot: [number, number];
}

const SHEETS: Record<ModiPose, Sheet> = {
  hello: { w: 366, fx: 1, foot: [175, 359] },
  pick: { w: 432, fx: 1, foot: [168, 361] },
  think: { w: 370, fx: 3, foot: [178, 363] },
  rain: { w: 429, fx: 1, foot: [174, 362] },
  cold: { w: 338, fx: 1, foot: [181, 360] },
  cheer: { w: 383, fx: 1, foot: [189, 359] },
  sorry: { w: 343, fx: 1, foot: [179, 361] },
  empty: { w: 417, fx: 1, foot: [187, 361] },
};

const breathe = { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } as const;
const mirror = (duration: number) => ({ duration, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }) as const;
const JUMP_TIMES = [0, 0.08, 0.25, 0.45, 0.6, 0.75, 1];

// 몸 움직임
const BODY: Record<ModiPose, TargetAndTransition> = {
  hello: { rotate: [0, 3.5, -2, 3.5, 0, 0], transition: { duration: 1.8, times: [0, 0.14, 0.27, 0.4, 0.55, 1], repeat: Infinity, ease: 'easeInOut' } },
  pick: { y: ['0%', '-2%', '0%'], transition: breathe },
  think: { rotate: [-2, 2], transition: mirror(3) },
  rain: { y: ['0%', '-2%', '0%'], transition: breathe },
  cold: { x: ['-0.6%', '0.6%'], transition: { duration: 0.08, repeat: Infinity, repeatType: 'mirror', ease: 'linear' } },
  cheer: {
    y: ['0%', '0%', '-9%', '0%', '-3%', '0%', '0%'],
    scaleX: [1, 1.04, 0.98, 1, 1, 1, 1],
    scaleY: [1, 0.95, 1.03, 1, 1, 1, 1],
    transition: { duration: 1.6, times: JUMP_TIMES, repeat: Infinity, ease: 'easeOut' },
  },
  sorry: { rotate: [0, 2.5], transition: mirror(3) },
  empty: { rotate: [-2, 2], transition: mirror(2.6) },
};

const pop = (duration: number): TargetAndTransition => ({ opacity: [0.3, 1], scale: [0.94, 1.03], transition: mirror(duration) });
const blink = (duration: number): TargetAndTransition => ({ opacity: [0.25, 1], transition: mirror(duration) });

// 효과 움직임. index 는 여러 장일 때의 순서
function effect(pose: ModiPose, index: number): TargetAndTransition {
  switch (pose) {
    case 'hello':
      return pop(0.6);
    case 'pick':
      return pop(0.7);
    case 'cheer':
      return pop(0.4);
    case 'think':
      return { y: ['0%', '-3%', '0%', '0%'], transition: { duration: 1.2, times: [0, 0.3, 0.6, 1], repeat: Infinity, ease: 'easeInOut', delay: index * 0.15 } };
    case 'rain':
      return { x: ['1%', '-1%'], y: ['-4%', '5%'], opacity: [0, 1, 0], transition: { duration: 0.8, repeat: Infinity, ease: 'linear', opacity: { duration: 0.8, times: [0, 0.25, 1], repeat: Infinity, ease: 'linear' } } };
    case 'cold':
      return blink(0.35);
    case 'sorry':
      return { y: ['-3%', '5%'], opacity: [0, 1, 0], transition: { duration: 1.8, repeat: Infinity, ease: 'easeIn', opacity: { duration: 1.8, times: [0, 0.2, 1], repeat: Infinity, ease: 'easeIn' } } };
    case 'empty':
      return blink(1.1);
  }
}

function shadow(pose: ModiPose): TargetAndTransition {
  if (pose === 'cheer') return { scaleX: [1, 1, 0.72, 1, 0.9, 1, 1], transition: { duration: 1.6, times: JUMP_TIMES, repeat: Infinity, ease: 'easeOut' } };
  if (pose === 'pick' || pose === 'rain') return { scaleX: [1, 0.93, 1], transition: breathe };
  return {};
}

interface ModiProps {
  pose?: ModiPose;
  // 표시 높이(px). 폭은 포즈 그림 비율에 맞춰 정해짐
  size?: number;
  className?: string;
}

export function Modi({ pose = 'hello', size = 48, className = '' }: ModiProps) {
  const still = useReducedMotion();
  const sheet = SHEETS[pose];
  const [footX, footY] = sheet.foot;
  const layers = Array.from({ length: sheet.fx }, (_, i) => (sheet.fx === 1 ? `${pose}-fx` : `${pose}-fx${i + 1}`));

  return (
    <m.span
      // 포즈가 바뀌면 다시 등장
      key={pose}
      className={`modi ${className}`}
      style={{ width: Math.round((sheet.w * size) / SHEET_H), height: size }}
      initial={still ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      aria-hidden="true"
    >
      <m.span
        className="modi__shadow"
        style={{
          left: `${((footX - SHADOW_W / 2) / sheet.w) * 100}%`,
          top: `${((footY - SHADOW_H / 2 - 3) / SHEET_H) * 100}%`,
          width: `${(SHADOW_W / sheet.w) * 100}%`,
          height: `${(SHADOW_H / SHEET_H) * 100}%`,
        }}
        animate={still ? undefined : shadow(pose)}
      />
      <m.img className="modi__layer" src={src(pose)} alt="" style={{ originX: 0.46, originY: 0.96 }} animate={still ? undefined : BODY[pose]} />
      {layers.map((name, index) => (
        <m.img key={name} className="modi__layer" src={src(name)} alt="" animate={still ? undefined : effect(pose, index)} />
      ))}
    </m.span>
  );
}
