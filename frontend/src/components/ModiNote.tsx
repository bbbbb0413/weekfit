// 기능: 모디의 한 줄 안내. 날씨와 일정에 맞춰 옷차림과 문장을 바꿈

import type { CalendarEvent, CurrentWeather } from '../api/types';
import coat from '../assets/modi/modi-coat.webp';
import jacket from '../assets/modi/modi-jacket.webp';
import plain from '../assets/modi/modi-main.webp';
import { formatTime } from '../lib/date';

function pick(weather: CurrentWeather | undefined, event: CalendarEvent | null): { image: string; line: string } {
  if (weather) {
    const feels = Math.round(weather.apparentTemperature);
    if (weather.condition === 'RAIN' || weather.condition === 'THUNDER') {
      return { image: coat, line: `비 소식이 있어요. 체감 ${feels}°에 맞는 겉옷과 우산을 챙겨요.` };
    }
    if (weather.condition === 'SNOW') return { image: coat, line: `눈이 와요. 체감 ${feels}°라 도톰하게 입어요.` };
    if (feels <= 8) return { image: jacket, line: `체감 ${feels}°로 쌀쌀해요. 겉옷을 하나 더해요.` };
    if (feels >= 27) return { image: plain, line: `체감 ${feels}°로 더워요. 가볍게 입어요.` };
  }
  if (event) return { image: plain, line: `${formatTime(event.startsAt)} ${event.title}에 맞춰 골라 볼까요?` };
  return { image: plain, line: '오늘 입을 옷을 같이 골라 볼까요?' };
}

export function ModiNote({ weather, event }: { weather: CurrentWeather | undefined; event: CalendarEvent | null }) {
  const { image, line } = pick(weather, event);
  return (
    <div className="modi-note">
      <img className="modi-note__face" src={image} alt="" />
      <p className="modi-note__line">
        <span className="modi-note__name">모디</span>
        {line}
      </p>
    </div>
  );
}
