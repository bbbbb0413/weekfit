// 기능: 살까 말까. 사려는 옷 사진 한 장으로 보유 검사, 내 옷과 맞춰 보기, 더 싼 제품 찾기

import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { Category, ClothingSuggestion, FindCategory, FindItem, MallLink, OutfitSlot, SimilarCheckResult, Sourced } from '../api/types';
import { FindCards, type FindState } from '../components/FindCards';
import { ItemFigure } from '../components/ItemFigure';
import { OutfitBoard, piecesOf, type Piece, type Pieces } from '../components/OutfitBoard';
import { ModiNote } from '../components/ModiNote';
import { PhotoPicker } from '../components/PhotoPicker';
import { ResultSkeleton, Spinner } from '../components/Skeleton';
import { SearchIcon } from '../components/icons';
import { useWeekPlan } from '../hooks/queries';
import { today } from '../lib/date';
import { CATEGORY_LABEL, SLOT_LABEL, itemLabel } from '../lib/labels';
import { QUICK, SNAPPY, TAP, fadeUp, list, listItem } from '../lib/motion';

const MAX_QUERY = 50;

type Mode = 'photo' | 'text';
const MODES: Array<[Mode, string]> = [
  ['photo', '사진으로'],
  ['text', '글로'],
];
// 눌러서 바로 채우는 예시 검색어
const EXAMPLES = ['네이비 케이블 니트 조끼', '베이지 트렌치코트', '흰색 가죽 스니커즈'];

const VERDICT: Record<SimilarCheckResult['verdict'], string> = {
  DUPLICATE: '거의 같은 옷이 옷장에 있어요',
  SIMILAR: '비슷한 옷이 옷장에 있어요',
  NEW: '옷장에 없는 새로운 옷이에요',
};

const FIND_SLOT: Record<FindCategory, OutfitSlot> = { TOP: 'TOP', VEST: 'TOP', BOTTOM: 'BOTTOM', OUTER: 'OUTER', SHOES: 'SHOES' };

function slotFor(category: Category | null): OutfitSlot | null {
  return category && category !== 'ACCESSORY' ? category : null;
}

function queryOf(attributes: ClothingSuggestion): string {
  return (attributes.name ?? [attributes.colors[0], attributes.subType ?? (attributes.category ? CATEGORY_LABEL[attributes.category] : null)].filter(Boolean).join(' ')).slice(0, MAX_QUERY);
}

export function BuyPage() {
  const plan = useWeekPlan(today());
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [check, setCheck] = useState<Sourced<SimilarCheckResult> | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [find, setFind] = useState<FindState>({ kind: 'idle' });
  const [chosen, setChosen] = useState<FindItem | null>(null);
  const [query, setQuery] = useState('');
  const [linkedQuery, setLinkedQuery] = useState('');
  const [links, setLinks] = useState<MallLink[]>([]);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('photo');
  // 사진을 바꾼 뒤 늦게 도착한 이전 응답을 버리기 위한 요청 번호
  const requestId = useRef(0);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const reset = (next: File | null) => {
    requestId.current += 1;
    setFile(next);
    setCheck(null);
    setChecking(false);
    setError(null);
    setFind({ kind: 'idle' });
    setChosen(null);
    setLinks([]);
    setLinkError(null);
    setText('');
  };

  // 찾는 방법을 바꾸면 앞서 본 결과를 비움
  const switchMode = (next: Mode) => {
    if (next === mode) return;
    reset(null);
    setMode(next);
  };

  const loadLinks = async (text: string, category: Category | null, id: number) => {
    try {
      const result = await api.shoppingLinks(text, category);
      if (id !== requestId.current) return;
      setLinks(result.links);
      setQuery(result.query);
      setLinkedQuery(result.query);
      setLinkError(null);
    } catch (e) {
      if (id === requestId.current) setLinkError((e as Error).message);
    }
  };

  const compare = async () => {
    if (!file) return;
    const id = ++requestId.current;
    setChecking(true);
    setError(null);
    try {
      const result = await api.similarCheck(file);
      if (id !== requestId.current) return;
      setCheck(result);
      const text = queryOf(result.data.attributes);
      if (text) loadLinks(text, result.data.attributes.category, id);
    } catch (e) {
      if (id === requestId.current) setError((e as Error).message);
    } finally {
      if (id === requestId.current) setChecking(false);
    }
  };

  // 사진으로 찾거나, 사진 없이 글로 찾음
  const startFind = (byText?: string) => {
    if (!byText && !file) return;
    const id = byText ? ++requestId.current : requestId.current;
    setFind({ kind: 'loading' });
    setChosen(null);
    if (byText) {
      setLinks([]);
      setQuery('');
      setLinkedQuery('');
    }
    api
      .shoppingFind(byText ? { text: byText } : { image: file! })
      .then((found) => {
        if (id !== requestId.current) return;
        if (!found) {
          setFind({ kind: 'unavailable' });
          return;
        }
        setFind({ kind: 'done', result: found });
        // 링크를 아직 못 만들었으면 AI 응답에 함께 온 링크로 채움
        if (found.searchQuery && found.fallbackLinks.length > 0) {
          setLinks((current) => (current.length > 0 ? current : found.fallbackLinks));
          setQuery((current) => current || found.searchQuery!);
          setLinkedQuery((current) => current || found.searchQuery!);
        }
      })
      .catch((e: Error) => {
        if (id === requestId.current) setFind({ kind: 'error', message: e.message });
      });
  };

  const refine = (event: FormEvent) => {
    event.preventDefault();
    const next = query.trim();
    if (next) loadLinks(next, check?.data.attributes.category ?? null, requestId.current);
  };

  const data = check?.data;
  const todayOutfit = plan.data?.days[0]?.outfit ?? null;

  // 오늘 코디에 사려는 옷이나 고른 제품을 넣은 보드
  const board = useMemo<{ pieces: Pieces; slot: OutfitSlot } | null>(() => {
    if (!data) return null;
    const slot = chosen?.category ? FIND_SLOT[chosen.category] : slotFor(data.attributes.category);
    if (!slot) return null;
    const trial: Piece = chosen
      ? { key: chosen.url, name: chosen.name, src: chosen.imageUrl, trial: true }
      : { key: 'candidate', name: data.attributes.name ?? '사려는 옷', src: preview, trial: true };
    const pieces: Pieces = { ...(todayOutfit ? piecesOf(todayOutfit) : {}), [slot]: trial };
    if (slot === 'DRESS') {
      delete pieces.TOP;
      delete pieces.BOTTOM;
    } else if (slot === 'TOP' || slot === 'BOTTOM') {
      delete pieces.DRESS;
    }
    return { pieces, slot };
  }, [data, chosen, preview, todayOutfit]);

  return (
    <div className="page page--buy">
      <header className="page-head">
        <div>
          <h1 className="page-title">살까 말까</h1>
          <p className="page-lead">사려는 옷 사진을 올리면 옷장에 비슷한 옷이 있는지 먼저 보고, 그래도 살 옷이면 더 싼 제품을 찾아요.</p>
        </div>
      </header>

      <div className="tool">
        <div className="segments" role="tablist" aria-label="찾는 방법">
          {MODES.map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={mode === value} className={`segment${mode === value ? ' is-on' : ''}`} onClick={() => switchMode(value)}>
              {mode === value && <m.span className="segment__on" layoutId="buy-mode" transition={SNAPPY} />}
              <span className="segment__label">{label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {mode === 'photo' ? (
            <m.div key="photo" className="tool__panel" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={QUICK}>
              <PhotoPicker label="사려는 옷 사진 올리기" hint="쇼핑몰 상품 사진을 캡처해도 돼요. 얼굴은 나오지 않게 해 주세요" file={file} onChange={reset} />
              {!data && (
                <m.button type="button" className="button button--primary button--block" whileTap={TAP} disabled={!file || checking} onClick={compare}>
                  {checking && <Spinner />}
                  {checking ? '옷장과 비교하는 중' : '내 옷장과 비교하기'}
                </m.button>
              )}
            </m.div>
          ) : (
            <m.form
              key="text"
              className="tool__panel"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={QUICK}
              onSubmit={(event) => {
                event.preventDefault();
                if (text.trim()) startFind(text.trim());
              }}
            >
              <div className="search-box">
                <label className="search">
                  <SearchIcon />
                  <span className="visually-hidden">찾는 옷</span>
                  <input autoFocus value={text} maxLength={300} placeholder="어떤 옷을 찾고 있어요?" onChange={(e) => setText(e.target.value)} />
                </label>
                <p className="search-box__hint">브랜드나 색, 종류를 적으면 비슷하면서 더 싼 제품을 찾아요.</p>
                <div className="search-box__examples">
                  {EXAMPLES.map((example) => (
                    <button key={example} type="button" className="filter" onClick={() => setText(example)}>
                      <span className="filter__label">{example}</span>
                    </button>
                  ))}
                </div>
              </div>
              <m.button type="submit" className="button button--primary button--block" whileTap={TAP} disabled={!text.trim() || find.kind === 'loading'}>
                {find.kind === 'loading' && <Spinner />}
                더 싼 제품 찾기
              </m.button>
            </m.form>
          )}
        </AnimatePresence>
        {error && <p className="note note--bad">{error}</p>}
      </div>

      {checking && (
        <>
          <ModiNote pose="think">사진에서 옷 종류와 색을 읽고 옷장과 비교하는 중이에요.</ModiNote>
          <ResultSkeleton />
        </>
      )}

      {data && (
        <>
          <m.section className="block" aria-label="보유 검사 결과" variants={fadeUp} initial="hidden" animate="show">
            {check.source === 'local' && <p className="note note--warn">데모 모드라 사진을 분석하지 않은 예시 결과예요. 서버에 연결하면 올린 사진으로 비교해요.</p>}
            <h2 className="result-title">{VERDICT[data.verdict]}</h2>
            <p className="summary">{data.comment}</p>
            {data.matches.length > 0 && (
              <m.ul className="matches" variants={list} initial="hidden" animate="show">
                {data.matches.map((match) => (
                  <m.li key={match.item.id} className="match" variants={listItem}>
                    <span className="match__picture">
                      <ItemFigure item={match.item} />
                    </span>
                    <span className="match__text">
                      <span className="match__name">{itemLabel(match.item)}</span>
                      <span className="match__reasons">{match.reasons.join(', ')}</span>
                    </span>
                    <span className="match__score" aria-label={`유사도 ${Math.round(match.similarity * 100)}퍼센트`}>
                      {Math.round(match.similarity * 100)}%
                    </span>
                  </m.li>
                ))}
              </m.ul>
            )}
          </m.section>

          {board && (
            <m.section className="block" aria-label="내 옷과 맞춰 보기" variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.08 }}>
              <h2 className="section-title">오늘 코디에 넣어 보면</h2>
              <OutfitBoard pieces={board.pieces} />
              <p className="summary">
                함께 입을 수 있는 내 옷이 <strong>{data.pairableCount}벌</strong> 있어요.
              </p>
            </m.section>
          )}

          <m.section className="block" aria-label="더 싼 제품" variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.16 }}>
            <h2 className="section-title">그래도 산다면</h2>
            {find.kind === 'idle' ? (
              <m.button type="button" className="button button--primary button--block" whileTap={TAP} onClick={() => startFind()}>
                더 싼 제품 찾기
              </m.button>
            ) : (
              <FindCards state={find} selectedUrl={chosen?.url ?? null} onSelect={(item) => setChosen((current) => (current?.url === item.url ? null : item))} />
            )}
            {find.kind === 'done' && find.result.items.some((item) => item.imageUrl) && board && <p className="hint">제품을 누르면 위 보드의 {SLOT_LABEL[board.slot]} 칸에 넣어 볼 수 있어요.</p>}
          </m.section>

        </>
      )}

      {!data && find.kind !== 'idle' && (
        <m.section className="block" aria-label="더 싼 제품" variants={fadeUp} initial="hidden" animate="show">
          <FindCards state={find} selectedUrl={null} onSelect={() => undefined} />
        </m.section>
      )}

      {(links.length > 0 || linkError) && (
        <m.section className="block" aria-label="쇼핑몰 검색" variants={fadeUp} initial="hidden" animate="show">
          <h2 className="section-title">쇼핑몰에서 직접 찾기</h2>
          <form className="requery" onSubmit={refine}>
            <label className="field">
              <span className="field__label">검색어</span>
              <input className="input" value={query} maxLength={MAX_QUERY} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <button type="submit" className="button button--small" disabled={!query.trim() || query.trim() === linkedQuery}>
              다시 찾기
            </button>
          </form>
          {linkError && <p className="note note--bad">{linkError}</p>}
          <ul className="malls">
            {links.map((link) => (
              <li key={link.mall} className="mall">
                <span className="mall__text">
                  <span className="mall__name">{link.mallName}</span>
                  <span className="mall__sort">{link.sortLabel}</span>
                </span>
                <a className="button button--small" href={link.url} target="_blank" rel="noreferrer">
                  검색 결과 보기
                </a>
              </li>
            ))}
          </ul>
        </m.section>
      )}
    </div>
  );
}
