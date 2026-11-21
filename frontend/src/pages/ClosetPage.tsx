// 기능: 옷장. 내 옷 사진 목록, 종류 필터, 상태 관리, 옷 등록

import { AnimatePresence, m } from 'framer-motion';
import { useState } from 'react';
import type { Category, Clothing } from '../api/types';
import { AddClothingSheet } from '../components/AddClothingSheet';
import { ItemFigure } from '../components/ItemFigure';
import { ItemSheet } from '../components/ItemSheet';
import { ModiState } from '../components/ModiNote';
import { ClosetSkeleton } from '../components/Skeleton';
import { PlusIcon } from '../components/icons';
import { useClothes } from '../hooks/queries';
import { CATEGORY_LABEL, STATUS_LABEL, itemLabel } from '../lib/labels';
import { QUICK, SNAPPY, TAP } from '../lib/motion';

type Filter = 'ALL' | 'WASH' | Category;

const ORDER: Category[] = ['TOP', 'BOTTOM', 'OUTER', 'DRESS', 'SHOES', 'ACCESSORY'];

function needsCare(item: Clothing): boolean {
  return item.status !== 'AVAILABLE' || item.needsWash;
}

function stateOf(item: Clothing): string | null {
  if (item.status !== 'AVAILABLE') return STATUS_LABEL[item.status];
  return item.needsWash ? '세탁할 때' : null;
}

export function ClosetPage() {
  const clothes = useClothes();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [managingId, setManagingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const closet = clothes.data ?? [];
  const categories = ORDER.filter((category) => closet.some((c) => c.category === category));
  const careCount = closet.filter(needsCare).length;
  const filters: Array<[Filter, string]> = [
    ['ALL', `전체 ${closet.length}`],
    ...categories.map<[Filter, string]>((category) => [category, CATEGORY_LABEL[category]]),
    ...(careCount > 0 ? [['WASH', `세탁, 수선 ${careCount}`] as [Filter, string]] : []),
  ];
  const active = filters.some(([value]) => value === filter) ? filter : 'ALL';
  const shown = closet.filter((c) => (active === 'ALL' ? true : active === 'WASH' ? needsCare(c) : c.category === active));
  const managing = closet.find((c) => c.id === managingId) ?? null;
  const editing = closet.find((c) => c.id === editingId) ?? null;

  return (
    <div className="page page--closet">
      <header className="page-head">
        <div>
          <h1 className="page-title">옷장</h1>
          {closet.length > 0 && (
            <p className="page-lead">
              {closet.length}벌 가운데 {closet.length - careCount}벌을 지금 입을 수 있어요.
            </p>
          )}
        </div>
        <button type="button" className="button button--primary button--small" onClick={() => setAdding(true)}>
          <PlusIcon width={18} height={18} /> 옷 등록
        </button>
      </header>

      {clothes.isPending && <ClosetSkeleton />}
      {clothes.isError && (
        <ModiState
          pose="sorry"
          title="옷장을 불러오지 못했어요"
          action={
            <button type="button" className="button" onClick={() => clothes.refetch()}>
              다시 불러오기
            </button>
          }
        >
          {(clothes.error as Error).message}
        </ModiState>
      )}

      {clothes.data && closet.length === 0 && (
        <ModiState
          pose="empty"
          title="아직 등록한 옷이 없어요"
          action={
            <button type="button" className="button button--primary" onClick={() => setAdding(true)}>
              첫 옷 등록하기
            </button>
          }
        >
          옷 사진 한 장을 올리면 종류와 색, 두께를 읽어서 채워 드려요.
        </ModiState>
      )}

      {closet.length > 0 && (
        <>
          <div className="filters" role="group" aria-label="옷 종류">
            {filters.map(([value, label]) => (
              <m.button
                key={value}
                type="button"
                whileTap={TAP}
                className={`filter${active === value ? ' is-on' : ''}`}
                aria-pressed={active === value}
                onClick={() => setFilter(value)}
              >
                {active === value && <m.span className="filter__on" layoutId="filter-on" transition={SNAPPY} />}
                <span className="filter__label">{label}</span>
              </m.button>
            ))}
          </div>

          <ul className="closet">
            {/* 필터를 바꾸면 남는 옷은 자리를 옮기고, 빠지는 옷은 작아지며 사라짐 */}
            <AnimatePresence mode="popLayout" initial={false}>
              {shown.map((item) => {
                const state = stateOf(item);
                return (
                  <m.li key={item.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={QUICK}>
                    <m.button type="button" whileTap={TAP} className={`garment${item.status !== 'AVAILABLE' ? ' is-away' : ''}`} onClick={() => setManagingId(item.id)}>
                    <span className="garment__picture">
                      <ItemFigure item={item} />
                    </span>
                    <span className="garment__name">{itemLabel(item)}</span>
                      <span className="garment__state">{state ?? `${item.wearsSinceWash}번 입음`}</span>
                    </m.button>
                  </m.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </>
      )}

      <AnimatePresence>
        {managing && <ItemSheet key="item" item={managing} onEdit={() => (setEditingId(managing.id), setManagingId(null))} onClose={() => setManagingId(null)} />}
        {editing && <AddClothingSheet key="edit" item={editing} onClose={() => setEditingId(null)} />}
        {adding && <AddClothingSheet key="add" onClose={() => setAdding(false)} />}
      </AnimatePresence>
    </div>
  );
}
