// 기능: 살까 말까. 코디 사진 한 장을 부위별 카드로 나눠 제품 정보, 옷장 중복 경고, 가성비 제품 찾기를 보여 줌

import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { Category, LookPiece, LookResult } from '../api/types';
import { FindCards } from '../components/FindCards';
import { LookView } from '../components/LookView';
import { ModiNote } from '../components/ModiNote';
import { PhotoPicker } from '../components/PhotoPicker';
import { ResultSkeleton, Spinner } from '../components/Skeleton';
import { SearchIcon } from '../components/icons';
import { buyRequestIds, useBuyField, useBuyMode, type BuyMode } from '../lib/buyStore';
import { QUICK, SNAPPY, TAP, fadeUp } from '../lib/motion';

const MAX_QUERY = 50;
// 시연용 예시 코디 사진 (public/demo)
const SAMPLE_PHOTO = '/demo/look-sample.jpg';
// 예시 사진의 분석과 가성비 결과를 미리 받아 둔 파일(심사 중 AI 호출 없이 바로 보여 줌)
const SAMPLE_RESULT = '/demo/look-sample.json';
const SAMPLE_NAME = 'modi-demo-look-sample.jpg';
const isSample = (file: File | null) => file?.name === SAMPLE_NAME;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Mode = BuyMode;
const MODES: Array<[Mode, string]> = [
  ['photo', '사진으로'],
  ['text', '글로'],
];
// 눌러서 바로 채우는 예시 검색어. 2026-11-22 실제 검색에서 쇼핑몰 2곳의 제품을 찾은 것만 둔다
const EXAMPLES = ['베이지 트렌치코트', '블랙 와이드 슬랙스', '연청 와이드 데님 팬츠'];

export function BuyPage() {
  // 다른 탭을 다녀와도 남도록 화면 밖 저장소에 둠 (lib/buyStore). 사진으로·글로는 칸이 따로라 오가도 남음
  const [mode, setMode] = useBuyMode();
  const [file, setFile] = useBuyField(mode, 'file');
  const [preview, setPreview] = useState<string | null>(null);
  const [look, setLook] = useBuyField(mode, 'look');
  const [looking, setLooking] = useBuyField(mode, 'looking');
  const [, setPresetFinds] = useBuyField(mode, 'presetFinds');
  const [, setPresetCrops] = useBuyField(mode, 'presetCrops');
  const [, setPieceFinds] = useBuyField(mode, 'pieceFinds');
  const [, setPieceSelected] = useBuyField(mode, 'pieceSelected');
  const [linkCategory, setLinkCategory] = useBuyField(mode, 'linkCategory');
  const [error, setError] = useBuyField(mode, 'error');
  const [find, setFind] = useBuyField(mode, 'find');
  const [query, setQuery] = useBuyField(mode, 'query');
  const [linkedQuery, setLinkedQuery] = useBuyField(mode, 'linkedQuery');
  const [links, setLinks] = useBuyField(mode, 'links');
  const [linkError, setLinkError] = useBuyField(mode, 'linkError');
  const [text, setText] = useBuyField(mode, 'text');
  const requestId = buyRequestIds[mode];

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
    setLook(null);
    setLooking(false);
    setLinkCategory(null);
    setError(null);
    setFind({ kind: 'idle' });
    setLinks([]);
    setLinkError(null);
    setText('');
  };

  // 찾는 방법을 바꿔도 각 방법에서 보던 결과는 그대로 둠
  const switchMode = (next: Mode) => {
    if (next !== mode) setMode(next);
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

  // 시연용: 사진 탭을 열면 예시 코디 사진이 미리 들어가 있음
  useEffect(() => {
    if (mode !== 'photo' || file) return;
    let alive = true;
    fetch(SAMPLE_PHOTO)
      .then((r) => r.blob())
      .then((blob) => {
        if (alive) setFile((now) => now ?? new File([blob], SAMPLE_NAME, { type: 'image/jpeg' }));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // 사진 한 장을 부위별 카드로 나눔 (AI 1회)
  const lookUp = async () => {
    if (!file) return;
    const id = ++requestId.current;
    setLooking(true);
    setError(null);
    try {
      setPieceFinds({});
      setPieceSelected(0);
      const baked = isSample(file) ? await fetch(SAMPLE_RESULT).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null;
      if (baked) await pause(1200);
      setPresetFinds(baked?.finds ?? {});
      setPresetCrops(baked?.crops ?? {});
      const result: LookResult = baked?.look ?? (await api.shoppingLook(file));
      if (id !== requestId.current) return;
      if (!result.aiAvailable) setError('사진을 분석하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setLook(result);
    } catch (e) {
      if (id === requestId.current) setError((e as Error).message);
    } finally {
      if (id === requestId.current) setLooking(false);
    }
  };

  // 카드를 고르면 아래 '쇼핑몰에서 직접 찾기'도 그 옷 검색어로 맞춤
  const followPiece = (piece: LookPiece) => {
    const text = (piece.searchQuery ?? piece.attributes.name ?? '').slice(0, MAX_QUERY);
    setLinkCategory(piece.attributes.category);
    if (text) loadLinks(text, piece.attributes.category, requestId.current);
  };

  // 사진으로 찾거나, 사진 없이 글로 찾음
  const startFind = (byText?: string) => {
    if (!byText && !file) return;
    const id = byText ? ++requestId.current : requestId.current;
    setFind({ kind: 'loading' });
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
    if (next) loadLinks(next, linkCategory, requestId.current);
  };

  return (
    <div className="page page--buy">
      <header className="page-head">
        <div>
          <h1 className="page-title">살까 말까</h1>
          <p className="page-lead">입은 사진이나 상품 사진을 올리면 옷을 부위별로 나눠 무슨 제품인지 알려 주고, 옷장에 거의 같은 옷이 있으면 경고해요.</p>
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
              {!look && (
                <m.button type="button" className="button button--primary button--block" whileTap={TAP} disabled={!file || looking} onClick={lookUp}>
                  {looking && <Spinner />}
                  {looking ? '사진 속 옷을 나눠 보는 중' : '살까 말까'}
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

      {looking && (
        <>
          <ModiNote pose="think">사진 속 옷을 부위별로 나누고 무슨 제품인지 읽는 중이에요.</ModiNote>
          <ResultSkeleton />
        </>
      )}

      {look && (
        <m.section className="block" aria-label="부위별 옷" variants={fadeUp} initial="hidden" animate="show">
          <LookView result={look} preview={preview} onSelect={followPiece} />
        </m.section>
      )}

      {!look && find.kind !== 'idle' && (
        <m.section className="block" aria-label="더 싼 제품" variants={fadeUp} initial="hidden" animate="show">
          <FindCards state={find} selectedUrl={null} onSelect={() => undefined} />
        </m.section>
      )}

      {(links.length > 0 || linkError) && (
        <m.section className="block block--separate" aria-label="쇼핑몰 검색" variants={fadeUp} initial="hidden" animate="show">
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
