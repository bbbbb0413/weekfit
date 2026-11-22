// 기능: 무료 서버가 깨어나는 동안 화면 위쪽에 띄우는 안내

import { AnimatePresence, m } from 'framer-motion';
import { SPRING } from '../lib/motion';
import { isWaking, useServerWake } from '../lib/serverWake';
import { Spinner } from './Skeleton';

export function WakeBanner() {
  const waking = useServerWake(isWaking);
  return (
    <div className="wake-region" role="status" aria-live="polite">
      <AnimatePresence>
        {waking && (
          <m.p className="wake" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={SPRING}>
            <Spinner />
            <span>
              서버를 깨우는 중이에요.
              <br />
              무료 서버라 오랜만에 접속하면 1~3분 걸려요.
            </span>
          </m.p>
        )}
      </AnimatePresence>
    </div>
  );
}
