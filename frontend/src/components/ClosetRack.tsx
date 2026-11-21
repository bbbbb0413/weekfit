// 기능: 행거. 종류별로 옷을 걸어 두고 눌러서 인형에 입힘

import { useMemo } from 'react';
import type { Category, Clothing } from '../api/types';
import { CATEGORY_LABEL, STATUS_LABEL, itemLabel } from '../lib/labels';
import { ItemFigure } from './ItemFigure';
import { MoreIcon, PlusIcon } from './icons';

const ORDER: Category[] = ['TOP', 'BOTTOM', 'OUTER', 'DRESS', 'SHOES', 'ACCESSORY'];

export function rackCategories(items: Clothing[]): Category[] {
  return ORDER.filter((c) => c === 'TOP' || items.some((i) => i.category === c));
}

interface ClosetRackProps {
  items: Clothing[];
  category: Category;
  onCategory: (category: Category) => void;
  wornIds: string[];
  onToggle: (item: Clothing) => void;
  onManage: (item: Clothing) => void;
  onAdd: () => void;
}

function statusTag(item: Clothing): string | null {
  if (item.status !== 'AVAILABLE') return STATUS_LABEL[item.status];
  if (item.needsWash) return '세탁 권장';
  return null;
}

export function ClosetRack({ items, category, onCategory, wornIds, onToggle, onManage, onAdd }: ClosetRackProps) {
  const categories = useMemo(() => rackCategories(items), [items]);
  const active = categories.includes(category) ? category : categories[0];
  const visible = items.filter((i) => i.category === active);

  return (
    <section className="rack" aria-label="옷장">
      <div className="rack__tabs" role="tablist" aria-label="옷 종류">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === active}
            className={`rack__tab${c === active ? ' is-active' : ''}`}
            onClick={() => onCategory(c)}
          >
            {CATEGORY_LABEL[c]}
            <span className="rack__count">{items.filter((i) => i.category === c).length}</span>
          </button>
        ))}
      </div>

      <div className="rack__scroller" key={active}>
        <ul className="rack__rail">
          {visible.map((item) => {
            const worn = wornIds.includes(item.id);
            const tag = statusTag(item);
            const wearable = item.category !== 'ACCESSORY';
            return (
              <li key={item.id} className={`hanger${worn ? ' is-worn' : ''}${item.status !== 'AVAILABLE' ? ' is-blocked' : ''}`}>
                <button
                  type="button"
                  className="hanger__main"
                  aria-pressed={wearable ? worn : undefined}
                  onClick={() => (wearable ? onToggle(item) : onManage(item))}
                >
                  <svg className="hanger__hook" viewBox="0 0 80 30" aria-hidden="true">
                    <path d="M40,14 Q40,4 46,4 Q52,4 52,9" fill="none" stroke="#14213D" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M40,14 L8,28 L72,28 Z" fill="none" stroke="#14213D" strokeWidth="2.5" strokeLinejoin="round" />
                  </svg>
                  <span className="hanger__figure">
                    <ItemFigure item={item} />
                  </span>
                  <span className="hanger__name">{itemLabel(item)}</span>
                  {worn && <span className="hanger__tape">입는 중</span>}
                  {tag && <span className="hanger__tag">{tag}</span>}
                </button>
                <button type="button" className="hanger__more" aria-label={`${itemLabel(item)} 상태 관리`} onClick={() => onManage(item)}>
                  <MoreIcon width={20} height={20} />
                </button>
              </li>
            );
          })}
          <li className="hanger hanger--add">
            <button type="button" className="hanger__add" onClick={onAdd}>
              <PlusIcon />
              <span>옷 등록</span>
            </button>
          </li>
        </ul>
      </div>
    </section>
  );
}
