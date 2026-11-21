// 기능: 숫자가 이전 값에서 새 값으로 올라가는 표시 (코디 점수)

import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function CountUp({ value }: { value: number }) {
  const still = useReducedMotion();
  const motionValue = useMotionValue(still ? value : 0);
  const [shown, setShown] = useState(still ? value : 0);

  useMotionValueEvent(motionValue, 'change', (latest) => setShown(Math.round(latest)));

  useEffect(() => {
    if (still) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] });
    return () => controls.stop();
  }, [value, still, motionValue]);

  return <>{shown}</>;
}
