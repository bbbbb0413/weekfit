// 기능: 모디 안내. 한 줄 말풍선과 빈 화면, 대기 화면에 쓰는 큰 안내

import { AnimatePresence, m } from 'framer-motion';
import type { ReactNode } from 'react';
import type { CalendarEvent, CurrentWeather } from '../api/types';
import { formatTime } from '../lib/date';
import { QUICK, fadeUp } from '../lib/motion';
import { Modi, type ModiPose } from './Modi';

// 날씨에 맞는 모디 포즈. 비와 눈에는 우산, 쌀쌀하면 움츠린 모습
export function poseFor(weather: CurrentWeather | undefined): ModiPose {
  if (!weather) return 'pick';
  if (weather.condition === 'RAIN' || weather.condition === 'THUNDER' || weather.condition === 'SNOW') return 'rain';
  return weather.apparentTemperature <= 8 ? 'cold' : 'pick';
}

export function todayLine(weather: CurrentWeather | undefined, event: CalendarEvent | null): string {
  if (weather) {
    const feels = Math.round(weather.apparentTemperature);
    if (weather.condition === 'RAIN' || weather.condition === 'THUNDER') return `비 소식이 있어요. 체감 ${feels}°에 맞춰 골랐으니 우산만 챙겨요.`;
    if (weather.condition === 'SNOW') return `눈이 와요. 체감 ${feels}°라 도톰하게 골랐어요.`;
    if (feels <= 8) return `체감 ${feels}°로 쌀쌀해요. 겉옷을 하나 더했어요.`;
    if (feels >= 27) return `체감 ${feels}°로 더워요. 가볍게 골랐어요.`;
  }
  if (event) return `${formatTime(event.startsAt)} ${event.title}에 맞춰 골랐어요.`;
  return '오늘 날씨와 평소 차림에 맞춰 골랐어요.';
}

export function ModiNote({ pose = 'pick', children }: { pose?: ModiPose; children: ReactNode }) {
  return (
    <div className="modi-note">
      <Modi pose={pose} size={52} />
      <p className="modi-note__line">
        <span className="modi-note__name">모디</span>
        <AnimatePresence mode="wait" initial={false}>
          <m.span key={typeof children === 'string' ? children : pose} className="modi-note__text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={QUICK}>
            {children}
          </m.span>
        </AnimatePresence>
      </p>
    </div>
  );
}

interface ModiStateProps {
  pose?: ModiPose;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function ModiState({ pose = 'think', title, children, action }: ModiStateProps) {
  return (
    <m.div className="modi-state" variants={fadeUp} initial="hidden" animate="show">
      <Modi pose={pose} size={120} />
      <p className="modi-state__title">{title}</p>
      {children && <div className="modi-state__body">{children}</div>}
      {action}
    </m.div>
  );
}
