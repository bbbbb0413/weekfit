// 기능: 날씨에 따라 바깥 풍경이 바뀌는 창문

import type { WeatherCondition } from '../api/types';
import { CONDITION_LABEL } from '../lib/labels';

const SKY: Record<WeatherCondition, string> = {
  CLEAR: '#7CC4FF',
  CLOUDY: '#B9C6D3',
  FOG: '#CFD6D4',
  RAIN: '#7F96B2',
  SNOW: '#C9DBEC',
  THUNDER: '#4E5A78',
};

const INK = '#14213D';

function Cloud({ x, y, scale = 1, fill = '#FFFFFF' }: { x: number; y: number; scale?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={fill}>
      <ellipse cx={22} cy={20} rx={22} ry={12} />
      <ellipse cx={42} cy={14} rx={18} ry={14} />
      <ellipse cx={60} cy={21} rx={18} ry={11} />
    </g>
  );
}

export function WeatherWindow({ condition, className }: { condition: WeatherCondition; className?: string }) {
  const wet = condition === 'RAIN' || condition === 'THUNDER';
  return (
    <svg className={className} viewBox="0 0 160 190" role="img" aria-label={`창밖 날씨: ${CONDITION_LABEL[condition]}`}>
      <defs>
        <clipPath id="window-glass">
          <rect x={10} y={10} width={140} height={160} rx={6} />
        </clipPath>
      </defs>
      <rect x={4} y={4} width={152} height={172} rx={10} fill="#FFFFFF" stroke={INK} strokeWidth={2.5} />
      <g clipPath="url(#window-glass)">
        <rect x={10} y={10} width={140} height={160} fill={SKY[condition]} />
        {condition === 'CLEAR' && (
          <>
            <circle cx={112} cy={50} r={22} fill="#FFCE3A" />
            <Cloud x={14} y={96} scale={0.9} />
          </>
        )}
        {(condition === 'CLOUDY' || condition === 'FOG') && (
          <>
            <Cloud x={70} y={26} />
            <Cloud x={8} y={66} scale={1.2} fill="#EEF2F5" />
            <Cloud x={62} y={112} scale={0.9} />
          </>
        )}
        {condition === 'FOG' && <rect x={10} y={10} width={140} height={160} fill="#FFFFFF" opacity={0.45} />}
        {wet && (
          <>
            <Cloud x={8} y={14} scale={1.1} fill={condition === 'THUNDER' ? '#8E98B4' : '#D7DFE8'} />
            <Cloud x={72} y={30} scale={1} fill={condition === 'THUNDER' ? '#A3ACC4' : '#E6ECF2'} />
            <g className="window__rain" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round">
              {[
                [24, 70], [52, 86], [84, 68], [116, 90], [140, 72],
                [34, 118], [66, 132], [100, 116], [130, 136], [18, 150], [82, 158], [148, 156],
              ].map(([x, y]) => (
                <line key={`${x}-${y}`} x1={x} y1={y} x2={x - 5} y2={y + 14} />
              ))}
            </g>
          </>
        )}
        {condition === 'THUNDER' && <path d="M96,60 L82,96 L94,96 L84,128 L112,88 L98,88 L108,60 Z" fill="#FFCE3A" stroke={INK} strokeWidth={2} strokeLinejoin="round" />}
        {condition === 'SNOW' && (
          <>
            <Cloud x={40} y={16} scale={1.1} />
            <g className="window__snow" fill="#FFFFFF">
              {[
                [26, 70], [58, 84], [92, 66], [124, 88], [142, 70],
                [38, 116], [72, 130], [104, 112], [134, 134], [20, 150], [86, 156],
              ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={3.2} />
              ))}
            </g>
          </>
        )}
      </g>
      <g stroke={INK} strokeWidth={2.5} fill="none">
        <rect x={10} y={10} width={140} height={160} rx={6} />
        <line x1={80} y1={10} x2={80} y2={170} />
        <line x1={10} y1={92} x2={150} y2={92} />
      </g>
      <rect x={0} y={174} width={160} height={12} rx={4} fill="#FFFFFF" stroke={INK} strokeWidth={2.5} />
    </svg>
  );
}
