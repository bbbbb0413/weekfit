// 기능: 옷 그림 (종이인형 좌표 0 0 200 400 기준 실루엣). 사진이 없는 옷 & 인형에 입힌 옷 표시

import { useId } from 'react';
import type { Category, Clothing } from '../api/types';
import { COLOR_HEX } from '../lib/labels';

export type GarmentItem = Pick<Clothing, 'category' | 'subType' | 'colors' | 'name'>;

const INK = '#14213D';
const DARK_FILLS = new Set(['블랙', '네이비', '브라운', '카키', '그린', '레드', '퍼플']);

type TopKind = 'shirt' | 'short' | 'knit' | 'sweat' | 'long';
type OuterKind = 'coat' | 'puffer' | 'cardigan' | 'jacket';
type BottomKind = 'slacks' | 'jeans' | 'joggers' | 'skirt' | 'shorts' | 'pants';
type ShoeKind = 'dress' | 'boot' | 'sneaker';

function has(text: string | null | undefined, pattern: RegExp): boolean {
  return Boolean(text && pattern.test(text));
}

function topKind(item: GarmentItem): TopKind {
  const text = `${item.subType ?? ''} ${item.name ?? ''}`;
  if (has(text, /셔츠|블라우스/) && !has(text, /티셔츠/)) return 'shirt';
  if (has(text, /반팔|민소매|나시/)) return 'short';
  if (has(text, /니트|스웨터/)) return 'knit';
  if (has(text, /맨투맨|후드|스웨트/)) return 'sweat';
  return 'long';
}

function outerKind(item: GarmentItem): OuterKind {
  const text = `${item.subType ?? ''} ${item.name ?? ''}`;
  if (has(text, /코트/)) return 'coat';
  if (has(text, /패딩|다운/)) return 'puffer';
  if (has(text, /가디건/)) return 'cardigan';
  return 'jacket';
}

function bottomKind(item: GarmentItem): BottomKind {
  const text = `${item.subType ?? ''} ${item.name ?? ''}`;
  if (has(text, /스커트|치마/)) return 'skirt';
  if (has(text, /반바지|쇼츠/)) return 'shorts';
  if (has(text, /슬랙스|정장/)) return 'slacks';
  if (has(text, /청바지|데님|진/)) return 'jeans';
  if (has(text, /트레이닝|조거|스웨트/)) return 'joggers';
  return 'pants';
}

function shoeKind(item: GarmentItem): ShoeKind {
  const text = `${item.subType ?? ''} ${item.name ?? ''}`;
  if (has(text, /구두|로퍼|더비|힐/)) return 'dress';
  if (has(text, /등산|트레킹|부츠|워커/)) return 'boot';
  return 'sneaker';
}

const TOP_LONG =
  'M84,68 Q100,79 116,68 L138,74 Q152,80 154,98 L160,198 L142,202 L134,116 L132,204 L68,204 L66,116 L58,202 L40,198 L46,98 Q48,80 62,74 Z';
const TOP_SHORT =
  'M84,68 Q100,79 116,68 L138,74 Q152,80 154,98 L158,124 L138,128 L134,112 L132,204 L68,204 L66,112 L62,128 L42,124 L46,98 Q48,80 62,74 Z';
const OUTER_COAT =
  'M82,66 L100,98 L118,66 L140,74 Q156,82 158,100 L165,204 L145,208 L138,120 L140,292 L60,292 L62,120 L55,208 L35,204 L42,100 Q44,82 60,74 Z';
const OUTER_SHORT =
  'M82,66 L100,98 L118,66 L140,74 Q156,82 158,100 L165,204 L145,208 L138,120 L138,216 L62,216 L62,120 L55,208 L35,204 L42,100 Q44,82 60,74 Z';
const OUTER_PUFFER =
  'M84,64 L100,76 L116,64 L142,72 Q160,80 162,100 L169,202 L147,208 L140,122 L140,218 L60,218 L60,122 L53,208 L31,202 L38,100 Q40,80 58,72 Z';
const PANTS = 'M68,198 L132,198 L134,212 L124,376 L104,376 L100,238 L96,376 L76,376 L66,212 Z';
const JOGGERS = 'M68,198 L132,198 L134,212 L122,362 L122,376 L106,376 L106,362 L100,238 L94,362 L94,376 L78,376 L78,362 L66,212 Z';
const SHORTS = 'M68,198 L132,198 L136,276 L104,276 L100,236 L96,276 L64,276 Z';
const SKIRT = 'M70,198 L130,198 L148,292 L52,292 Z';
const DRESS =
  'M84,68 Q100,79 116,68 L138,74 Q152,80 154,98 L158,124 L138,128 L134,112 L130,160 L150,300 L50,300 L70,160 L66,112 L62,128 L42,124 L46,98 Q48,80 62,74 Z';
const SHOE_LEFT = 'M70,366 L98,366 L98,384 Q98,388 94,388 L66,388 Q62,388 62,382 Q62,373 70,366 Z';
const SHOE_RIGHT = 'M102,366 L130,366 Q138,373 138,382 Q138,388 134,388 L106,388 Q102,388 102,384 Z';
const BOOT_LEFT = 'M72,352 L98,352 L98,384 Q98,388 94,388 L64,388 Q60,388 60,382 Q60,372 72,366 Z';
const BOOT_RIGHT = 'M102,352 L128,352 L128,366 Q140,372 140,382 Q140,388 136,388 L106,388 Q102,388 102,384 Z';

const SOLO_VIEWBOX: Record<string, string> = {
  top: '32 58 136 152',
  coat: '26 58 148 240',
  outerShort: '26 58 148 166',
  bottom: '54 192 92 190',
  shorts: '54 192 92 92',
  skirt: '46 192 108 106',
  dress: '36 58 128 248',
  shoes: '54 346 92 48',
  accessory: '0 0 100 100',
};

interface Paint {
  fill: string;
  second: string;
  detail: string;
}

function paintOf(item: GarmentItem): Paint {
  const main = item.colors[0] ?? '그레이';
  const dark = DARK_FILLS.has(main);
  return {
    fill: COLOR_HEX[main],
    second: COLOR_HEX[item.colors[1] ?? '화이트'],
    detail: dark ? 'rgba(255,255,255,0.62)' : 'rgba(20,33,61,0.55)',
  };
}

const outline = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: 'round' as const };
const thin = { fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round' as const };

function Top({ item }: { item: GarmentItem }) {
  const kind = topKind(item);
  const paint = paintOf(item);
  const clipId = useId();
  const d = kind === 'short' ? TOP_SHORT : TOP_LONG;
  const striped = item.colors.length >= 2;
  return (
    <g>
      <path d={d} fill={paint.fill} {...outline} />
      {striped && (
        <>
          <clipPath id={clipId}>
            <path d={d} />
          </clipPath>
          <g clipPath={`url(#${clipId})`} stroke={paint.second} strokeWidth={5}>
            {[92, 108, 124, 140, 156, 172, 188].map((y) => (
              <line key={y} x1={30} x2={170} y1={y} y2={y} />
            ))}
          </g>
          <path d={d} fill="none" {...outline} />
        </>
      )}
      {kind === 'shirt' && (
        <g stroke={paint.detail} {...thin}>
          <path d="M84,68 L100,82 L92,95 L80,75 Z" fill={paint.fill} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <path d="M116,68 L100,82 L108,95 L120,75 Z" fill={paint.fill} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <line x1={100} y1={84} x2={100} y2={203} />
          {[108, 132, 156, 180].map((y) => (
            <circle key={y} cx={100} cy={y} r={1.8} fill={paint.detail} stroke="none" />
          ))}
        </g>
      )}
      {(kind === 'knit' || kind === 'sweat') && (
        <g stroke={paint.detail} {...thin}>
          <path d="M84,68 Q100,79 116,68" strokeWidth={5} />
          <line x1={69} y1={196} x2={131} y2={196} />
          {kind === 'knit' && [76, 84, 92, 100, 108, 116, 124].map((x) => <line key={x} x1={x} y1={197} x2={x} y2={203} />)}
          <line x1={42} y1={190} x2={59} y2={194} />
          <line x1={158} y1={190} x2={141} y2={194} />
        </g>
      )}
      {(kind === 'long' || kind === 'short') && !striped && (
        <path d="M84,68 Q100,79 116,68" stroke={paint.detail} {...thin} strokeWidth={3.5} />
      )}
    </g>
  );
}

function Outer({ item }: { item: GarmentItem }) {
  const kind = outerKind(item);
  const paint = paintOf(item);
  const clipId = useId();
  if (kind === 'puffer') {
    return (
      <g>
        <path d={OUTER_PUFFER} fill={paint.fill} {...outline} />
        <clipPath id={clipId}>
          <path d={OUTER_PUFFER} />
        </clipPath>
        <g clipPath={`url(#${clipId})`} stroke={paint.detail} {...thin}>
          {[104, 132, 160, 188].map((y) => (
            <line key={y} x1={30} x2={170} y1={y} y2={y} />
          ))}
        </g>
        <line x1={100} y1={76} x2={100} y2={217} stroke={paint.detail} {...thin} strokeWidth={2.2} />
      </g>
    );
  }
  const d = kind === 'coat' ? OUTER_COAT : OUTER_SHORT;
  const hem = kind === 'coat' ? 291 : 215;
  return (
    <g>
      <path d={d} fill={paint.fill} {...outline} />
      <g stroke={paint.detail} {...thin}>
        <line x1={100} y1={98} x2={100} y2={hem} strokeWidth={2} />
        {kind === 'coat' && (
          <>
            <path d="M82,66 L72,92 L100,118" />
            <path d="M118,66 L128,92 L100,118" />
            <circle cx={108} cy={142} r={2.2} fill={paint.detail} stroke="none" />
            <circle cx={108} cy={176} r={2.2} fill={paint.detail} stroke="none" />
            <line x1={70} y1={222} x2={88} y2={222} />
            <line x1={112} y1={222} x2={130} y2={222} />
          </>
        )}
        {kind === 'cardigan' && (
          <>
            {[122, 146, 170, 194].map((y) => (
              <circle key={y} cx={106} cy={y} r={2} fill={paint.detail} stroke="none" />
            ))}
            <line x1={63} y1={208} x2={137} y2={208} />
          </>
        )}
        {kind === 'jacket' && (
          <>
            <path d="M82,66 L86,58 L114,58 L118,66" fill={paint.fill} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
            <line x1={66} y1={172} x2={86} y2={166} />
            <line x1={134} y1={172} x2={114} y2={166} />
          </>
        )}
      </g>
    </g>
  );
}

function Bottom({ item }: { item: GarmentItem }) {
  const kind = bottomKind(item);
  const paint = paintOf(item);
  if (kind === 'skirt') {
    return (
      <g>
        <path d={SKIRT} fill={paint.fill} {...outline} />
        <line x1={71} y1={206} x2={129} y2={206} stroke={paint.detail} {...thin} />
      </g>
    );
  }
  const d = kind === 'shorts' ? SHORTS : kind === 'joggers' ? JOGGERS : PANTS;
  return (
    <g>
      <path d={d} fill={paint.fill} {...outline} />
      <g stroke={paint.detail} {...thin}>
        <line x1={68} y1={207} x2={132} y2={207} />
        {kind === 'slacks' && (
          <>
            <line x1={84} y1={212} x2={86} y2={372} />
            <line x1={116} y1={212} x2={114} y2={372} />
          </>
        )}
        {kind === 'jeans' && (
          <>
            <path d="M72,210 Q76,224 88,226" />
            <path d="M128,210 Q124,224 112,226" />
            <line x1={100} y1={208} x2={100} y2={236} />
          </>
        )}
        {kind === 'joggers' && (
          <>
            <line x1={79} y1={362} x2={93} y2={362} />
            <line x1={107} y1={362} x2={121} y2={362} />
            <path d="M96,208 L94,222 M104,208 L106,222" />
          </>
        )}
      </g>
    </g>
  );
}

function Dress({ item }: { item: GarmentItem }) {
  const paint = paintOf(item);
  return (
    <g>
      <path d={DRESS} fill={paint.fill} {...outline} />
      <g stroke={paint.detail} {...thin}>
        <path d="M84,68 Q100,79 116,68" strokeWidth={3.5} />
        <line x1={71} y1={160} x2={129} y2={160} />
      </g>
    </g>
  );
}

function Shoes({ item }: { item: GarmentItem }) {
  const kind = shoeKind(item);
  const paint = paintOf(item);
  const left = kind === 'boot' ? BOOT_LEFT : SHOE_LEFT;
  const right = kind === 'boot' ? BOOT_RIGHT : SHOE_RIGHT;
  return (
    <g>
      <path d={left} fill={paint.fill} {...outline} />
      <path d={right} fill={paint.fill} {...outline} />
      <g stroke={kind === 'dress' ? paint.detail : INK} {...thin}>
        {kind !== 'dress' && (
          <>
            <path d="M63,382 L98,382" strokeWidth={2} />
            <path d="M102,382 L137,382" strokeWidth={2} />
          </>
        )}
        <g stroke={paint.detail}>
          <path d="M76,370 L90,370 M76,375 L90,375" />
          <path d="M110,370 L124,370 M110,375 L124,375" />
        </g>
      </g>
    </g>
  );
}

function Accessory({ item }: { item: GarmentItem }) {
  const paint = paintOf(item);
  return (
    <g>
      <path d="M22,40 L78,40 L84,90 L16,90 Z" fill={paint.fill} {...outline} />
      <path d="M36,40 Q36,16 50,16 Q64,16 64,40" fill="none" {...outline} />
    </g>
  );
}

// 인형 좌표계 그대로 그리는 옷 (인형 svg 안에서 사용)
export function GarmentLayer({ item }: { item: GarmentItem }) {
  switch (item.category) {
    case 'TOP':
      return <Top item={item} />;
    case 'OUTER':
      return <Outer item={item} />;
    case 'BOTTOM':
      return <Bottom item={item} />;
    case 'DRESS':
      return <Dress item={item} />;
    case 'SHOES':
      return <Shoes item={item} />;
    default:
      return null;
  }
}

export function soloViewBox(item: GarmentItem): string {
  const category: Category = item.category;
  if (category === 'TOP') return SOLO_VIEWBOX.top;
  if (category === 'OUTER') return outerKind(item) === 'coat' ? SOLO_VIEWBOX.coat : SOLO_VIEWBOX.outerShort;
  if (category === 'BOTTOM') {
    const kind = bottomKind(item);
    return kind === 'skirt' ? SOLO_VIEWBOX.skirt : kind === 'shorts' ? SOLO_VIEWBOX.shorts : SOLO_VIEWBOX.bottom;
  }
  if (category === 'DRESS') return SOLO_VIEWBOX.dress;
  if (category === 'SHOES') return SOLO_VIEWBOX.shoes;
  return SOLO_VIEWBOX.accessory;
}

// 옷 한 벌만 잘라서 보여주는 그림 (행거, 목록용)
export function GarmentSolo({ item }: { item: GarmentItem }) {
  return item.category === 'ACCESSORY' ? <Accessory item={item} /> : <GarmentLayer item={item} />;
}

export function GarmentArt({ item, className }: { item: GarmentItem; className?: string }) {
  return (
    <svg className={className} viewBox={soloViewBox(item)} preserveAspectRatio="xMidYMin meet" aria-hidden="true">
      <GarmentSolo item={item} />
    </svg>
  );
}
