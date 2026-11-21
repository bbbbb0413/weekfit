// 기능: 사진으로 가성비 옷 찾기. 검색어를 만들어 쇼핑몰 5곳의 검색 결과로 연결

import { useState, type FormEvent } from 'react';
import { api } from '../api';
import type { Category, ShoppingResult } from '../api/types';
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

  const run = async (work: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const search = () =>
    run(async () => {
      if (!file) return;
      const found = await api.shoppingSimilar(file);
      setResult(found.data);
      setCategory(found.data.attributes?.category ?? null);
      setQuery(found.data.query);
      setSample(found.source === 'local');
    });

  const refine = (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    run(async () => {
      const next = await api.shoppingLinks(query.trim(), category);
      setResult(next);
      setQuery(next.query);
      setSample(false);
    });
  };

  const reset = (next: File | null) => {
    setFile(next);
    setResult(null);
    setError(null);
  };

  return (
    <div className="page page--tool">
      <header className="page-head">
        <div>
          <h1 className="page-title">가성비 옷 찾기</h1>
          <p className="page-lead">마음에 드는 옷 사진을 올리면 검색어를 만들어 쇼핑몰 5곳의 검색 결과로 연결해요.</p>
        </div>
      </header>

      <div className="tool">
        <PhotoPicker label="찾고 싶은 옷 사진 올리기" hint="캡처한 상품 사진도 괜찮아요" file={file} onChange={reset} />
        <button type="button" className="button button--accent button--block" disabled={!file || loading} onClick={search}>
          {loading && !result ? '찾는 중' : '비슷한 상품 찾기'}
        </button>
        {error && <p className="note note--bad">{error}</p>}
      </div>

      {result && (
        <section className="result" aria-label="검색 결과">
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
          <ul className="malls">
            {result.links.map((link) => (
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
          <p className="note">가격은 각 쇼핑몰의 검색 결과에서 확인해요.</p>
        </section>
      )}
    </div>
  );
}
