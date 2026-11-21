// 기능: 사기 전에. 사려는 옷 사진 한 장으로 보유 검사, 내 옷과 맞춰 보기, 더 싼 제품 찾기

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { Category, ClothingSuggestion, FindCategory, FindItem, MallLink, OutfitSlot, SimilarCheckResult, Sourced } from '../api/types';
import { FindCards, type FindState } from '../components/FindCards';
import { ItemFigure } from '../components/ItemFigure';
import { OutfitBoard, piecesOf, type Piece, type Pieces } from '../components/OutfitBoard';
import { PhotoPicker } from '../components/PhotoPicker';
import { useWeekPlan } from '../hooks/queries';
import { today } from '../lib/date';
import { CATEGORY_LABEL, SLOT_LABEL, itemLabel } from '../lib/labels';

const MAX_QUERY = 50;

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

  const startFind = () => {
    if (!file) return;
    const id = requestId.current;
    setFind({ kind: 'loading' });
    setChosen(null);
    api
      .shoppingFind({ image: file })
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
          <h1 className="page-title">사기 전에</h1>
          <p className="page-lead">사려는 옷 사진을 올리면 옷장에 비슷한 옷이 있는지 먼저 보고, 그래도 살 옷이면 더 싼 제품을 찾아요.</p>
        </div>
      </header>

      <div className="tool">
        <PhotoPicker label="사려는 옷 사진 올리기" hint="쇼핑몰 상품 사진을 캡처해도 돼요. 얼굴은 나오지 않게 해 주세요" file={file} onChange={reset} />
        {!data && (
          <button type="button" className="button button--primary button--block" disabled={!file || checking} onClick={compare}>
            {checking ? '옷장과 비교하는 중' : '내 옷장과 비교하기'}
          </button>
        )}
        {error && <p className="note note--bad">{error}</p>}
      </div>

      {data && (
        <>
          <section className="block" aria-label="보유 검사 결과">
            {check.source === 'local' && <p className="note note--warn">데모 모드라 사진을 분석하지 않은 예시 결과예요. 서버에 연결하면 올린 사진으로 비교해요.</p>}
            <h2 className="result-title">{VERDICT[data.verdict]}</h2>
            <p className="summary">{data.comment}</p>
            {data.matches.length > 0 && (
              <ul className="matches">
                {data.matches.map((m) => (
                  <li key={m.item.id} className="match">
                    <span className="match__picture">
                      <ItemFigure item={m.item} />
                    </span>
                    <span className="match__text">
                      <span className="match__name">{itemLabel(m.item)}</span>
                      <span className="match__reasons">{m.reasons.join(', ')}</span>
                    </span>
                    <span className="match__score" aria-label={`유사도 ${Math.round(m.similarity * 100)}퍼센트`}>
                      {Math.round(m.similarity * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {board && (
            <section className="block" aria-label="내 옷과 맞춰 보기">
              <h2 className="section-title">오늘 코디에 넣어 보면</h2>
              <OutfitBoard pieces={board.pieces} />
              <p className="summary">
                함께 입을 수 있는 내 옷이 <strong>{data.pairableCount}벌</strong> 있어요.
              </p>
            </section>
          )}

          <section className="block" aria-label="더 싼 제품">
            <h2 className="section-title">그래도 산다면</h2>
            {find.kind === 'idle' ? (
              <button type="button" className="button button--primary button--block" onClick={startFind}>
                더 싼 제품 찾기
              </button>
            ) : (
              <FindCards state={find} selectedUrl={chosen?.url ?? null} onSelect={(item) => setChosen((current) => (current?.url === item.url ? null : item))} />
            )}
            {find.kind === 'done' && find.result.items.some((item) => item.imageUrl) && board && <p className="hint">제품을 누르면 위 보드의 {SLOT_LABEL[board.slot]} 칸에 넣어 볼 수 있어요.</p>}
          </section>

          {(links.length > 0 || linkError) && (
            <section className="block" aria-label="쇼핑몰 검색">
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
            </section>
          )}
        </>
      )}
    </div>
  );
}
