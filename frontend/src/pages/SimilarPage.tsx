// 기능: 비슷한 옷 보유 검사. 사려는 옷이 옷장에 이미 있는지 확인

import { useState } from 'react';
import { api } from '../api';
import type { SimilarCheckResult, Sourced } from '../api/types';
import { ItemFigure } from '../components/ItemFigure';
import { PhotoPicker } from '../components/PhotoPicker';
import { itemLabel } from '../lib/labels';

const VERDICT: Record<SimilarCheckResult['verdict'], string> = {
  DUPLICATE: '거의 같은 옷이 옷장에 있어요',
  SIMILAR: '비슷한 옷이 옷장에 있어요',
  NEW: '옷장에 없는 새로운 옷이에요',
};

export function SimilarPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Sourced<SimilarCheckResult> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await api.similarCheck(file));
    } catch (e) {
      setResult(null);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const data = result?.data;

  return (
    <div className="page page--tool">
      <header className="page-head">
        <div>
          <h1 className="page-title">보유 검사</h1>
          <p className="page-lead">사려는 옷 사진을 올리면 옷장에 비슷한 옷이 있는지 먼저 확인해요.</p>
        </div>
      </header>

      <div className="tool">
        <PhotoPicker label="사려는 옷 사진 올리기" hint="쇼핑몰 상품 사진을 캡처해서 올려도 돼요" file={file} onChange={(f) => (setFile(f), setResult(null))} />
        <button type="button" className="button button--accent button--block" disabled={!file || loading} onClick={check}>
          {loading ? '비교하는 중' : '옷장과 비교하기'}
        </button>
        {error && <p className="note note--bad">{error}</p>}
      </div>

      {data && (
        <section className="result" aria-label="검사 결과">
          {result.source === 'local' && <p className="note note--warn">데모 모드라 사진을 분석하지 않은 예시 결과예요. 백엔드를 연결하면 올린 사진으로 비교해요.</p>}
          <h2 className={`verdict verdict--${data.verdict.toLowerCase()}`}>{VERDICT[data.verdict]}</h2>
          <p className="summary">{data.comment}</p>
          <p className="pairable">
            함께 입을 수 있는 내 옷 <strong>{data.pairableCount}벌</strong>
          </p>
          {data.matches.length > 0 && (
            <ul className="matches">
              {data.matches.map((m) => (
                <li key={m.item.id} className="match">
                  <span className="match__figure">
                    <ItemFigure item={m.item} />
                  </span>
                  <div className="match__text">
                    <p className="match__name">{itemLabel(m.item)}</p>
                    <p className="match__reasons">{m.reasons.join(', ')}</p>
                  </div>
                  <span className="match__score" aria-label={`유사도 ${Math.round(m.similarity * 100)}퍼센트`}>
                    {Math.round(m.similarity * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
