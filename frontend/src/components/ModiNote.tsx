// 기능: 모디 안내. 한 줄 말풍선과 빈 화면, 대기 화면에 쓰는 큰 안내

import type { ReactNode } from 'react';
import type { CalendarEvent, CurrentWeather } from '../api/types';
import coat from '../assets/modi/modi-coat.webp';
import jacket from '../assets/modi/modi-jacket.webp';
import plain from '../assets/modi/modi-main.webp';
import { formatTime } from '../lib/date';

export type ModiLook = 'plain' | 'jacket' | 'coat';

const IMAGE: Record<ModiLook, string> = { plain, jacket, coat };

// 날씨에 맞는 모디 옷차림
export function lookFor(weather: CurrentWeather | undefined): ModiLook {
  if (!weather) return 'plain';
  if (weather.condition === 'RAIN' || weather.condition === 'THUNDER' || weather.condition === 'SNOW') return 'coat';
  return weather.apparentTemperature <= 8 ? 'jacket' : 'plain';
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

export function ModiNote({ look = 'plain', children }: { look?: ModiLook; children: ReactNode }) {
  return (
    <div className="modi-note">
      <img className="modi-note__face" src={IMAGE[look]} alt="" />
      <p className="modi-note__line">
        <span className="modi-note__name">모디</span>
        {children}
      </p>
    </div>
  );
}

interface ModiStateProps {
  look?: ModiLook;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function ModiState({ look = 'plain', title, children, action }: ModiStateProps) {
  return (
    <div className="modi-state">
      <img className="modi-state__face" src={IMAGE[look]} alt="" />
      <p className="modi-state__title">{title}</p>
      {children && <div className="modi-state__body">{children}</div>}
      {action}
    </div>
  );
}
