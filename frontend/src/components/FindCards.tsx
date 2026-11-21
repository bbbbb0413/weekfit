// 기능: AI가 찾은 더 싼 제품 카드. 로딩, 결과 없음, 실패 상태를 함께 그린다

import type { FindItem, FindResult } from '../api/types';

export type FindState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; result: FindResult }
  | { kind: 'error'; message: string }
  | { kind: 'unavailable' };

const won = new Intl.NumberFormat('ko-KR');

// 23.9만 같은 짧은 가격 표기
function shortPrice(price: number): string {
  if (price >= 10_000) return `${Math.round(price / 1_000) / 10}만`;
  return `${won.format(price)}원`;
}

export function FindCards({ state }: { state: Exclude<FindState, { kind: 'idle' }> }) {
  return (
    <section className="result finds" aria-label="AI가 찾은 제품" aria-busy={state.kind === 'loading'}>
      <h2 className="result__title">AI가 찾은 더 싼 제품</h2>
      <FindBody state={state} />
    </section>
  );
}

function FindBody({ state }: { state: Exclude<FindState, { kind: 'idle' }> }) {
  if (state.kind === 'loading') {
    return (
      <div className="finds__loading" role="status">
        <span className="finds__bar" aria-hidden="true" />
        <p>쇼핑몰을 검색하고 가격을 비교하는 중이에요. 20초쯤 걸려요. 그동안 아래 쇼핑몰 링크를 먼저 볼 수 있어요.</p>
      </div>
    );
  }
  if (state.kind === 'unavailable') {
    return <p className="note note--warn">데모 모드에서는 AI 제품 찾기를 쓸 수 없어요. 서버에 연결하면 실제 제품을 찾아 드려요.</p>;
  }
  if (state.kind === 'error') {
    return <p className="note note--bad">{state.message}</p>;
  }
  const { result } = state;
  const originalPrice = result.original?.price ?? null;
  return (
    <>
      {result.analysis && <p className="finds__analysis">{result.analysis}</p>}
      {result.items.length > 0 && (
        <ul className="finds__list">
          {result.items.map((item) => (
            <FindCard key={item.url} item={item} originalPrice={originalPrice} />
          ))}
        </ul>
      )}
      {result.warnings.map((warning) => (
        <p key={warning} className={result.items.length > 0 ? 'note' : 'note note--warn'}>
          {warning}
        </p>
      ))}
    </>
  );
}

function FindCard({ item, originalPrice }: { item: FindItem; originalPrice: number | null }) {
  return (
    <li className="find-card">
      <div className="find-card__thumb">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" width={88} height={88} loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <span aria-hidden="true">{item.mall}</span>
        )}
      </div>
      <div className="find-card__body">
        <p className="find-card__mall">{item.mall}</p>
        <p className="find-card__name">{item.name}</p>
        <p className="find-card__price">
          {won.format(item.price)}원
          {originalPrice !== null && originalPrice > item.price && (
            <span className="find-card__compare">
              원본 {shortPrice(originalPrice)} → {shortPrice(item.price)}
            </span>
          )}
        </p>
        <p className="find-card__reason">{item.reason}</p>
        {item.size && (
          <details className="find-card__more">
            <summary>자세히보기</summary>
            <p>{item.size} 사이즈(추천)</p>
          </details>
        )}
      </div>
      <a className="button button--small find-card__link" href={item.url} target="_blank" rel="noreferrer">
        상품 보기
      </a>
    </li>
  );
}
