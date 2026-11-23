// 기능: 코디 보드. 겉옷, 상의, 하의, 신발을 사진 칸으로 한눈에 표시

import { m } from 'framer-motion';
import type { ReactNode } from 'react';
import type { Clothing, Outfit, OutfitSlot } from '../api/types';
import { COLOR_HEX, SLOT_LABEL, itemLabel } from '../lib/labels';
import { EASE_OUT, list, listItem } from '../lib/motion';
import { photoOf } from '../lib/photos';
import { PlusIcon, SwapIcon } from './icons';

export interface Piece {
  key: string;
  name: string;
  src: string | null;
  // 사진이 없을 때 칠할 색
  swatch?: string;
  // 세탁 필요 같은 짧은 상태
  note?: string;
  // 옷장에 없는 옷을 넣어 본 칸
  trial?: boolean;
}

export type Pieces = Partial<Record<OutfitSlot, Piece>>;

export function pieceOf(item: Clothing): Piece {
  const color = item.colors[0];
  return {
    key: item.id,
    name: itemLabel(item),
    src: photoOf(item),
    swatch: color ? COLOR_HEX[color] : undefined,
    note: item.status !== 'AVAILABLE' ? '지금 못 입어요' : item.needsWash ? '세탁할 때' : undefined,
  };
}

export function piecesOf(outfit: Outfit): Pieces {
  return outfit.items.reduce<Pieces>((pieces, { slot, item }) => ({ ...pieces, [slot]: pieceOf(item) }), {});
}

function slotsFor(pieces: Pieces): OutfitSlot[] {
  return pieces.DRESS ? ['OUTER', 'DRESS', 'SHOES'] : ['OUTER', 'TOP', 'BOTTOM', 'SHOES'];
}

// key 가 바뀌면 새로 그려져서 바꾼 옷이 0.25초 동안 올라오며 나타남
function Picture({ piece }: { piece: Piece }) {
  const enter = { initial: { opacity: 0, y: 12, scale: 0.94 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0.25, ease: EASE_OUT } };
  if (piece.src) return <m.img key={piece.key} className="board__photo" src={piece.src} alt="" referrerPolicy="no-referrer" {...enter} />;
  return <m.span key={piece.key} className="board__swatch" style={{ background: piece.swatch }} aria-hidden="true" {...enter} />;
}

interface OutfitBoardProps {
  pieces: Pieces;
  // 칸을 눌러 옷을 바꿀 수 있는 보드
  onSlot?: (slot: OutfitSlot) => void;
  busy?: boolean;
  // 왼쪽 위 큰 칸에 둘 것(옷 입힌 마네킹). 있으면 살까 말까처럼 사진 둘레에 옷 카드를 둠
  lead?: ReactNode;
}

export function OutfitBoard({ pieces, onSlot, busy, lead }: OutfitBoardProps) {
  return (
    <ul className={`board${lead ? ' board--lead' : ''}`} aria-busy={busy || undefined}>
      {lead && <li className="board__slot board__slot--lead">{lead}</li>}
      {slotsFor(pieces).map((slot) => {
        const piece = pieces[slot];
        const label = SLOT_LABEL[slot];
        const body = piece ? (
          <>
            <span className="board__label">
              {label}
              {piece.trial && <em className="board__trial">넣어 본 옷</em>}
            </span>
            <span className="board__picture">
              <Picture piece={piece} />
            </span>
            <span className="board__name">{piece.name}</span>
            {piece.note && <span className="board__note">{piece.note}</span>}
            {onSlot && <SwapIcon className="board__swap" width={18} height={18} />}
          </>
        ) : (
          <>
            <span className="board__label">{label}</span>
            <span className="board__empty">
              {onSlot && <PlusIcon width={20} height={20} />}
              {onSlot ? `${label} 더하기` : `${label} 없이`}
            </span>
          </>
        );
        return (
          <li key={slot} className={`board__slot board__slot--${slot.toLowerCase()}${piece?.trial ? ' is-trial' : ''}`}>
            {onSlot ? (
              <m.button type="button" className="board__cell" whileTap={{ scale: 0.97 }} onClick={() => onSlot(slot)} aria-label={piece ? `${label} ${piece.name}, 바꾸기` : `${label} 더하기`}>
                {body}
              </m.button>
            ) : (
              <div className="board__cell">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// 주간 계획용 한 줄 보드
export function OutfitStrip({ pieces }: { pieces: Pieces }) {
  const slots = slotsFor(pieces).filter((slot) => pieces[slot]);
  return (
    <m.ul className="strip" variants={list} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }}>
      {slots.map((slot) => {
        const piece = pieces[slot]!;
        return (
          <m.li key={slot} className="strip__item" variants={listItem}>
            <span className="strip__picture">
              <Picture piece={piece} />
            </span>
            <span className="strip__name">{piece.name}</span>
          </m.li>
        );
      })}
    </m.ul>
  );
}
