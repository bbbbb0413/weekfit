// 기능: 오늘 고른 옷을 캐릭터(길쭉한 마네킹 또는 기존 모디)에 입혀 보여 줌
// AI가 옷 사진과 캐릭터 관절 기준점만 보고 옷 한 벌씩 SVG로 그려 주면 그대로 겹쳐 입힘(구역 제한 없음)
// AI 그림이 오기 전이나 실패하면 부위 마스크에 옷 색을 칠해 대신 보여 줌

import { useQueries } from '@tanstack/react-query';
import { Fragment } from 'react';
import { api } from '../api';
import type { AvatarModel, Clothing, OutfitSlot } from '../api/types';
import modiBottom from '../assets/avatar/bottom.png';
import modiDress from '../assets/avatar/dress.png';
import modiOuterLong from '../assets/avatar/outer-long.png';
import modiOuter from '../assets/avatar/outer.png';
import modiScarf from '../assets/avatar/scarf.webp';
import modiShoes from '../assets/avatar/shoes.png';
import modiTop from '../assets/avatar/top.png';
import mqBody from '../assets/mannequin/body.webp';
import mqBottomShort from '../assets/mannequin/bottom-short.png';
import mqBottom from '../assets/mannequin/bottom.png';
import mqDress from '../assets/mannequin/dress.png';
import mqOuterLong from '../assets/mannequin/outer-long.png';
import mqOuter from '../assets/mannequin/outer.png';
import mqShoes from '../assets/mannequin/shoes.png';
import mqTopShort from '../assets/mannequin/top-short.png';
import mqTop from '../assets/mannequin/top.png';
import modiBody from '../assets/modi/hello.webp';
import { COLOR_HEX, slotOf } from '../lib/labels';

// 포즈별 마네킹: 몸 그림과 대체용 색 마스크
function poseSpec(files: Record<string, string>) {
  const f = (name: string) => Object.entries(files).find(([path]) => path.endsWith(`/${name}`))?.[1] ?? '';
  return {
    body: f('body.webp'),
    aspect: '1086 / 1448',
    masks: {
      TOP: f('top.png'),
      TOP_SHORT: f('top-short.png'),
      BOTTOM: f('bottom.png'),
      BOTTOM_SHORT: f('bottom-short.png'),
      OUTER: f('outer.png'),
      OUTER_LONG: f('outer-long.png'),
      SHOES: f('shoes.png'),
      DRESS: f('dress.png'),
    },
  };
}
const waveFiles = import.meta.glob<string>('../assets/mannequin/wave/*', { eager: true, query: '?url', import: 'default' });
const hipFiles = import.meta.glob<string>('../assets/mannequin/hip/*', { eager: true, query: '?url', import: 'default' });
const crossFiles = import.meta.glob<string>('../assets/mannequin/cross/*', { eager: true, query: '?url', import: 'default' });


type Masks = Partial<Record<OutfitSlot | 'OUTER_LONG' | 'TOP_SHORT' | 'BOTTOM_SHORT', string>>;

const MODELS: Record<AvatarModel, { body: string; aspect: string; masks: Masks; overlay?: string }> = {
  mannequin: {
    body: mqBody,
    aspect: '1086 / 1448',
    masks: { TOP: mqTop, TOP_SHORT: mqTopShort, BOTTOM: mqBottom, BOTTOM_SHORT: mqBottomShort, OUTER: mqOuter, OUTER_LONG: mqOuterLong, SHOES: mqShoes, DRESS: mqDress },
  },
  wave: poseSpec(waveFiles),
  hip: poseSpec(hipFiles),
  cross: poseSpec(crossFiles),
  modi: {
    body: modiBody,
    aspect: '366 / 378',
    masks: { TOP: modiTop, BOTTOM: modiBottom, OUTER: modiOuter, OUTER_LONG: modiOuterLong, SHOES: modiShoes, DRESS: modiDress },
    // 목도리는 옷 위에 다시 얹어 모디다움을 유지
    overlay: modiScarf,
  },
};

// 아래에서 위로 겹치는 순서
const ORDER: OutfitSlot[] = ['BOTTOM', 'DRESS', 'TOP', 'SHOES', 'OUTER'];

const said = (item: Clothing, pattern: RegExp) => pattern.test(`${item.name} ${item.subType ?? ''}`);

function maskOf(masks: Masks, slot: OutfitSlot, item: Clothing): string | undefined {
  if (slot === 'OUTER' && said(item, /코트|롱|트렌치/)) return masks.OUTER_LONG ?? masks.OUTER;
  if (slot === 'TOP' && said(item, /반팔|민소매|나시|슬리브리스/)) return masks.TOP_SHORT ?? masks.TOP;
  if (slot === 'BOTTOM' && said(item, /반바지|쇼츠|숏팬츠/)) return masks.BOTTOM_SHORT ?? masks.BOTTOM;
  return masks[slot];
}

function colorPaint(item: Clothing): string {
  const hex = item.colors.map((c) => COLOR_HEX[c]).filter(Boolean);
  if (hex.length === 0) return '#C9C3BA';
  if (said(item, /스트라이프|줄무늬/) && hex.length > 1) {
    return `repeating-linear-gradient(180deg, ${hex[0]} 0 7px, ${hex[1]} 7px 14px)`;
  }
  if (hex.length > 1) return `linear-gradient(160deg, ${hex[0]} 55%, ${hex[1]} 55%)`;
  return hex[0];
}

// 옷 입히기는 신규 마네킹 3종만 씀. 날마다 이 순서로 돌아가며 입힘
export const MANNEQUIN_POSES: AvatarModel[] = ['wave', 'hip', 'cross'];

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function ModiAvatar({ items, size = 180, model = 'wave' }: { items: Clothing[]; size?: number; model?: AvatarModel }) {
  const spec = MODELS[model];
  const worn = new Map<OutfitSlot, Clothing>();
  items.forEach((item) => {
    const slot = slotOf(item.category);
    if (slot) worn.set(slot, item);
  });
  const layers = ORDER.filter((slot) => worn.has(slot)).map((slot) => ({ slot, item: worn.get(slot)! }));

  // 옷과 캐릭터 조합마다 한 번 그리면 서버가 캐시하므로 브라우저도 오래 보관
  const paints = useQueries({
    queries: layers.map(({ item }) => ({
      queryKey: ['avatarPaint', model, item.id, item.name, item.colors.join(','), item.imageUrl],
      queryFn: () => api.avatarPaint(item.id, model),
      staleTime: Infinity,
      gcTime: 60 * 60_000,
      retry: 0,
    })),
  });
  const drawing = paints.some((p) => p.isFetching);
  // 옷 그림이 다 올 때까지 마네킹을 숨겼다가 한 번에 보여 줌(옷 없는 맨몸이 비치지 않게, 입히는 효과 없음)
  const ready = paints.every((p) => !p.isPending);

  return (
    <div
      className="modi-avatar"
      style={{ width: size, aspectRatio: spec.aspect, visibility: ready ? 'visible' : 'hidden' }}
      aria-label={`입은 옷: ${items.map((i) => i.name).join(', ') || '없음'}`}
    >
      <img className="modi-avatar__body" src={spec.body} alt="" />
      {layers.map(({ slot, item }, i) => {
        const svg = paints[i]?.data?.svg;
        const mask = maskOf(spec.masks, slot, item);
        // 부위 마스크가 있으면 옷 색을 먼저 칠하고, AI 그림은 같은 마스크로 잘라 얹음(마네킹 밖으로 삐져나오지 않게)
        const clip = mask ? { WebkitMaskImage: `url(${mask})`, maskImage: `url(${mask})` } : undefined;
        return (
          <Fragment key={`${slot}-${item.id}`}>
            {mask && (
              <div className="modi-avatar__layer" style={{ background: colorPaint(item), ...clip }}>
                <img className="modi-avatar__texture" src={spec.body} alt="" />
              </div>
            )}
            {svg && <img className="modi-avatar__layer" src={svgUrl(svg)} alt="" style={clip} />}
          </Fragment>
        );
      })}
      {spec.overlay && <img className="modi-avatar__body" src={spec.overlay} alt="" />}
      {(drawing || !ready) && (
        <span className="modi-avatar__badge" style={{ visibility: 'visible' }}>
          옷 그리는 중
        </span>
      )}
    </div>
  );
}
