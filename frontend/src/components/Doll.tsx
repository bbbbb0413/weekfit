// 기능: 종이인형. 입힌 옷을 신발, 하의, 상의, 겉옷 순서로 겹쳐 그림

import type { Clothing } from '../api/types';
import { GarmentLayer } from './Garment';
import { itemLabel } from '../lib/labels';

const SKIN = '#F0DCCB';
const INK = '#3B302D';

// 옷을 입히기 전 몸 (기본 속옷 포함). 3D 무대에서는 이 그림만 따로 한 장으로 사용
export function DollBody() {
  return (
    <>
      <g stroke={INK} strokeWidth={2.5} strokeLinejoin="round" fill={SKIN}>
        <path d="M66,76 Q52,80 50,100 L44,196 Q44,206 52,206 Q59,206 60,196 L68,112 Z" />
        <path d="M134,76 Q148,80 150,100 L156,196 Q156,206 148,206 Q141,206 140,196 L132,112 Z" />
        <path d="M67,204 L99,204 L96,372 L78,372 Z" />
        <path d="M101,204 L133,204 L122,372 L104,372 Z" />
        <ellipse cx={86} cy={379} rx={13} ry={8} />
        <ellipse cx={114} cy={379} rx={13} ry={8} />
        <rect x={92} y={54} width={16} height={20} />
        <path d="M66,74 Q100,66 134,74 L130,150 Q128,180 134,206 L66,206 Q72,180 70,150 Z" />
        <ellipse cx={100} cy={34} rx={22} ry={25} />
      </g>
      <g fill="#FFFFFF" stroke={INK} strokeWidth={2} strokeLinejoin="round">
        <path d="M78,73 Q100,84 122,73 L134,76 L130,150 Q129,176 132,198 L68,198 Q71,176 70,150 L66,76 Z" />
        <path d="M67,198 L133,198 L130,236 L104,236 L100,222 L96,236 L70,236 Z" />
      </g>
      <path d="M78,34 Q76,8 100,8 Q124,8 122,34 Q118,20 100,20 Q82,20 78,34 Z" fill="#2B2D33" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <g fill={INK}>
        <circle cx={92} cy={37} r={2} />
        <circle cx={108} cy={37} r={2} />
      </g>
      <path d="M94,46 Q100,50 106,46" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </>
  );
}

export const DOLL_LAYER_ORDER = ['SHOES', 'BOTTOM', 'DRESS', 'TOP', 'OUTER'] as const;

export function Doll({ items, className }: { items: Clothing[]; className?: string }) {
  const layers = DOLL_LAYER_ORDER.map((category) => items.find((i) => i.category === category)).filter(
    (i): i is Clothing => Boolean(i),
  );
  const description =
    layers.length > 0 ? `인형이 입은 옷: ${layers.map((i) => itemLabel(i)).join(', ')}` : '아직 아무것도 입지 않은 인형';

  return (
    <svg className={className} viewBox="0 0 200 400" role="img" aria-label={description}>
      <ellipse cx={100} cy={389} rx={54} ry={8} fill="rgba(20,33,61,0.25)" />
      <DollBody />
      {layers.map((item) => (
        <g key={item.id} className="doll__layer">
          <GarmentLayer item={item} />
        </g>
      ))}
    </svg>
  );
}
