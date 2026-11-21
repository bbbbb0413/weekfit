// 기능: 스플래시. 앱을 열거나 새로 고칠 때마다 모디와 로고가 나타났다가 위로 걷히며 첫 화면을 보여 줌

import { m, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import logo from '../assets/modi/logo.webp';
import { EASE_OUT, SPRING } from '../lib/motion';
import { Modi } from './Modi';

// 모디 등장, 로고, 한 줄 소개까지 보여 주는 시간
const SHOW_MS = 2300;

export function Splash({ onDone }: { onDone: () => void }) {
  const still = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(onDone, still ? 900 : SHOW_MS);
    return () => clearTimeout(timer);
  }, [onDone, still]);

  return (
    <m.div
      className="splash"
      role="img"
      aria-label="modi, 모든 날의 코디"
      onClick={onDone}
      initial={{ opacity: 1 }}
      // 막이 오르듯 위로 걷힘
      exit={still ? { opacity: 0 } : { y: '-100%' }}
      transition={{ duration: 0.55, ease: [0.7, 0, 0.3, 1] }}
    >
      <m.div className="splash__inner" exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.3 }}>
        <Modi pose="hello" size={176} />
        {/* 왼쪽에서 오른쪽으로 써 내려가듯 드러남 */}
        <m.img
          className="splash__logo"
          src={logo}
          alt=""
          initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 0.4 }}
          animate={{ clipPath: 'inset(0 0% 0 0)', opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.45 }}
        />
        <m.p className="splash__tagline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 1.1 }}>
          모든 날의 코디
        </m.p>
      </m.div>
      <m.span className="splash__bar" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: SHOW_MS / 1000, ease: 'linear' }} />
    </m.div>
  );
}
