// 기능: 오늘 날씨 띠. 하늘색과 해, 구름, 안개, 비, 눈, 번개 움직임으로 바깥 날씨 표시

import type { CSSProperties, ReactNode } from 'react';
import type { CurrentWeather, WeatherCondition } from '../api/types';
import { CONDITION_LABEL } from '../lib/labels';
import { Bone } from './Skeleton';

// 화면 폭에 고르게 흩어 놓은 빗줄기 & 눈송이 위치 (가로 %, 시작 시점 차이 초)
const DROPS: Array<[number, number]> = [
  [4, 0], [11, 0.5], [19, 0.2], [27, 0.8], [34, 0.1], [42, 0.6], [49, 0.3], [57, 0.9],
  [64, 0.15], [72, 0.55], [79, 0.35], [87, 0.75], [94, 0.05],
];

// 구름 위치 & 속도. 서로 다른 속도로 오른쪽에서 왼쪽으로 흐름
const CLOUDS: CSSProperties[] = [
  { top: 24, width: 92, animationDuration: '22s', animationDelay: '-4s' },
  { top: 56, width: 70, opacity: 0.8, animationDuration: '30s', animationDelay: '-17s' },
  { top: 38, width: 58, opacity: 0.65, animationDuration: '18s', animationDelay: '-11s' },
];

const FOG: CSSProperties[] = [
  { top: 18, animationDuration: '9s' },
  { top: 42, animationDuration: '7s', animationDelay: '-3s' },
  { top: 66, animationDuration: '11s', animationDelay: '-6s' },
];

function Sky({ condition }: { condition: WeatherCondition }) {
  switch (condition) {
    case 'CLEAR':
      return (
        <>
          <i className="band__rays" />
          <i className="band__sun" />
          <i className="band__cloud" style={{ top: 58, width: 64, opacity: 0.9, animationDuration: '34s', animationDelay: '-12s' }} />
        </>
      );
    case 'CLOUDY':
      return (
        <>
          {CLOUDS.map((style, index) => (
            <i key={index} className="band__cloud" style={style} />
          ))}
        </>
      );
    case 'FOG':
      return (
        <>
          {FOG.map((style, index) => (
            <i key={index} className="band__fogbar" style={style} />
          ))}
        </>
      );
    case 'RAIN':
    case 'THUNDER':
      return (
        <>
          {DROPS.map(([left, delay]) => (
            <i
              key={left}
              className="band__drop"
              style={{ left: `${left}%`, animationDelay: `-${delay}s`, animationDuration: condition === 'THUNDER' ? '0.55s' : undefined }}
            />
          ))}
          {condition === 'THUNDER' && (
            <>
              <i className="band__flash" />
              <i className="band__bolt" />
            </>
          )}
        </>
      );
    case 'SNOW':
      return (
        <>
          {DROPS.map(([left, delay], index) => (
            <i key={left} className="band__flake" style={{ left: `${left}%`, animationDelay: `-${delay * 6}s`, animationDuration: `${5 + (index % 4)}s` }} />
          ))}
        </>
      );
  }
}

interface WeatherBandProps {
  date: string;
  weather: CurrentWeather | undefined;
  failed: boolean;
  children?: ReactNode;
}

export function WeatherBand({ date, weather, failed, children }: WeatherBandProps) {
  const condition = weather?.condition ?? 'CLOUDY';
  return (
    <section className={`band band--${condition.toLowerCase()}`} aria-label="오늘 날씨">
      {weather && (
        <div className="band__sky" aria-hidden="true">
          <Sky condition={condition} />
        </div>
      )}
      <div className="band__text">
        <p className="band__date">{date}</p>
        {weather ? (
          <p className="band__now">
            <span className="band__temp">{Math.round(weather.temperature)}°</span>
            <span className="band__detail">
              {CONDITION_LABEL[weather.condition]}, 체감 {Math.round(weather.apparentTemperature)}°, 비 올 확률 {weather.precipitationProbability}%
            </span>
          </p>
        ) : failed ? (
          <p className="band__detail">날씨를 불러오지 못했어요. 두께는 평소 기준으로 골랐어요.</p>
        ) : (
          <p className="band__now" role="status" aria-label="날씨를 확인하는 중이에요">
            <Bone w={56} h={32} />
            <Bone w={170} h={14} />
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
