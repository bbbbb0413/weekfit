// 기능: 코디 보드. 겉옷, 상의, 하의, 신발을 사진 칸으로 한눈에 표시

import type { Clothing, Outfit, OutfitSlot } from '../api/types';
import { COLOR_HEX, SLOT_LABEL, itemLabel } from '../lib/labels';
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

function Picture({ piece }: { piece: Piece }) {
  if (piece.src) return <img className="board__photo" src={piece.src} alt="" referrerPolicy="no-referrer" />;
  return <span className="board__swatch" style={{ background: piece.swatch }} aria-hidden="true" />;
}

interface OutfitBoardProps {
  pieces: Pieces;
  // 칸을 눌러 옷을 바꿀 수 있는 보드
  onSlot?: (slot: OutfitSlot) => void;
  busy?: boolean;
}

export function OutfitBoard({ pieces, onSlot, busy }: OutfitBoardProps) {
  return (
    <ul className="board" aria-busy={busy || undefined}>
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
              <button type="button" className="board__cell" onClick={() => onSlot(slot)} aria-label={piece ? `${label} ${piece.name}, 바꾸기` : `${label} 더하기`}>
                {body}
              </button>
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
    <ul className="strip">
      {slots.map((slot) => {
        const piece = pieces[slot]!;
        return (
          <li key={slot} className="strip__item">
            <span className="strip__picture">
              <Picture piece={piece} />
            </span>
            <span className="strip__name">{piece.name}</span>
          </li>
        );
      })}
    </ul>
  );
}
