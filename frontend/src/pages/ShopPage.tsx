// 기능: 사진으로 가성비 옷 찾기. 쇼핑몰 링크를 먼저 보여 주고, AI가 찾은 실제 제품 카드를 이어서 채운다

import { useRef, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { Category, FindResult, MallLink, ShoppingResult } from '../api/types';
import { FindCards, type FindState } from '../components/FindCards';
import { PhotoPicker } from '../components/PhotoPicker';

const MAX_QUERY = 50;

export function ShopPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ShoppingResult | null>(null);
  // 사진 분석으로 알아낸 옷 종류. 검색어를 고쳐도 무신사 종류 필터에 계속 사용
  const [category, setCategory] = useState<Category | null>(null);
  const [query, setQuery] = useState('');
  const [sample, setSample] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [find, setFind] = useState<FindState>({ kind: 'idle' });
  // 사진을 바꾼 뒤 늦게 도착한 이전 응답을 버리기 위한 요청 번호
  const requestId = useRef(0);

  const startFind = (image: File, id: number) => {
    setFind({ kind: 'loading' });
    api
      .shoppingFind({ image })
      .then((found) => {
        if (id !== requestId.current) return;
        if (!found) {
          setFind({ kind: 'unavailable' });
          return;
        }
        setFind({ kind: 'done', result: found });
        // 링크 요청이 실패했으면 AI 응답에 함께 온 링크로 채운다
        setResult((current) => current ?? fallbackResult(found));
      })
      .catch((e: Error) => {
        if (id === requestId.current) setFind({ kind: 'error', message: e.message });
      });
  };

  const search = async () => {
    if (!file) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    setResult(null);
    startFind(file, id);
    try {
      const found = await api.shoppingSimilar(file);
      if (id !== requestId.current) return;
      setResult(found.data);
      setCategory(found.data.attributes?.category ?? null);
      setQuery(found.data.query);
      setSample(found.source === 'local');
    } catch (e) {
      if (id === requestId.current) setError((e as Error).message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  const refine = async (event: FormEvent) => {
    event.preventDefault();
    const next = query.trim();
    if (!next) return;
    setLoading(true);
    setError(null);
    try {
      const links = await api.shoppingLinks(next, category);
      setResult(links);
      setQuery(links.query);
      setSample(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const reset = (next: File | null) => {
    requestId.current += 1;
    setFile(next);
    setResult(null);
    setError(null);
    setLoading(false);
    setFind({ kind: 'idle' });
  };

  const busy = loading || find.kind === 'loading';

  return (
    <div className="page page--tool">
      <header className="page-head">
        <div>
          <h1 className="page-title">가성비 옷 찾기</h1>
          <p className="page-lead">마음에 드는 옷 사진을 올리면 쇼핑몰 5곳의 검색 결과로 연결하고, AI가 비슷하면서 더 싼 제품을 찾아 드려요.</p>
        </div>
      </header>

      <div className="tool">
        <PhotoPicker label="찾고 싶은 옷 사진 올리기" hint="캡처한 상품 사진도 괜찮아요. 얼굴은 나오지 않게 해 주세요" file={file} onChange={reset} />
        <button type="button" className="button button--accent button--block" disabled={!file || busy} onClick={search}>
          {busy ? '찾는 중' : '비슷한 상품 찾기'}
        </button>
        {error && !result && <p className="note note--bad">{error}</p>}
      </div>

      {find.kind !== 'idle' && <FindCards state={find} />}

      {result && (
        <section className="result" aria-label="쇼핑몰 검색 결과">
          <h2 className="result__title">쇼핑몰에서 더 찾아보기</h2>
          {sample && (
            <p className="note note--warn">데모 모드라 사진을 분석하지 않은 예시 검색어예요. 검색어를 고치면 그 검색어로 링크를 다시 만들어요.</p>
          )}
          <form className="requery" onSubmit={refine}>
            <label className="field">
              <span className="field__label">검색어</span>
              <input className="input" value={query} maxLength={MAX_QUERY} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <button type="submit" className="button button--small" disabled={loading || !query.trim() || query.trim() === result.query}>
              다시 찾기
            </button>
          </form>
          {error && <p className="note note--bad">{error}</p>}
          <MallList links={result.links} />
          <p className="note">가격은 각 쇼핑몰의 검색 결과에서 확인해요.</p>
        </section>
      )}
    </div>
  );
}

function MallList({ links }: { links: MallLink[] }) {
  return (
    <ul className="malls">
      {links.map((link) => (
        <li key={link.mall} className="mall">
          <div>
            <p className="mall__name">{link.mallName}</p>
            <p className="mall__sort">{link.sortLabel}</p>
          </div>
          <a className="button button--small" href={link.url} target="_blank" rel="noreferrer">
            검색 결과 보기
          </a>
        </li>
      ))}
    </ul>
  );
}

function fallbackResult(found: FindResult): ShoppingResult | null {
  if (!found.searchQuery || found.fallbackLinks.length === 0) return null;
  return { attributes: null, query: found.searchQuery, links: found.fallbackLinks };
}
