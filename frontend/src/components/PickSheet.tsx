// 기능: 보드의 한 칸에 넣을 옷 고르기

import { m } from 'framer-motion';
import type { Clothing, OutfitSlot } from '../api/types';
import { SLOT_LABEL, STATUS_LABEL, itemLabel } from '../lib/labels';
import { josa } from '../lib/josa';
import { TAP, list, listItem } from '../lib/motion';
import { ItemFigure } from './ItemFigure';
import { Sheet } from './Sheet';

interface PickSheetProps {
  slot: OutfitSlot;
  closet: Clothing[];
  currentId: string | undefined;
  onPick: (item: Clothing) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function PickSheet({ slot, closet, currentId, onPick, onRemove, onClose }: PickSheetProps) {
  const label = SLOT_LABEL[slot];
  // 상의나 하의 칸에서는 원피스도 함께 보여 줌
  const items = closet.filter((c) => c.category === slot || (c.category === 'DRESS' && (slot === 'TOP' || slot === 'BOTTOM')));
  const removable = Boolean(currentId) && (slot === 'OUTER' || slot === 'SHOES');

  return (
    <Sheet title={`${label} 고르기`} onClose={onClose}>
      {items.length === 0 ? (
        <p className="summary">옷장에 {josa(label, '이가')} 아직 없어요. 옷장 탭에서 등록하면 여기에 보여요.</p>
      ) : (
        <m.ul className="picks" variants={list} initial="hidden" animate="show">
          {items.map((item) => {
            const wearable = item.status === 'AVAILABLE';
            const selected = item.id === currentId;
            return (
              <m.li key={item.id} variants={listItem}>
                <m.button
                  type="button"
                  whileTap={wearable ? TAP : undefined}
                  className={`pick${selected ? ' is-on' : ''}`}
                  aria-pressed={selected}
                  disabled={!wearable}
                  onClick={() => onPick(item)}
                >
                  <span className="pick__picture">
                    <ItemFigure item={item} />
                  </span>
                  <span className="pick__name">{itemLabel(item)}</span>
                  <span className="pick__state">{wearable ? (item.needsWash ? '세탁할 때' : `두께 ${item.warmth}`) : STATUS_LABEL[item.status]}</span>
                </m.button>
              </m.li>
            );
          })}
        </m.ul>
      )}
      {removable && (
        <button type="button" className="button" onClick={onRemove}>
          {label} 없이 입기
        </button>
      )}
    </Sheet>
  );
}
