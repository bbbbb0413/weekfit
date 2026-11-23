// 기능: AI가 찾은 더 싼 제품. 대기 단계, 결과 카드, 실패 안내

import { m } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { FindItem, FindResult } from '../api/types';
import { TAP, list, listItem } from '../lib/motion';
import { ModiState } from './ModiNote';
import { FindCardSkeleton } from './Skeleton';
import { CheckIcon } from './icons';

export type FindState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; result: FindResult }
  | { kind: 'error'; message: string }
  | { kind: 'unavailable' };

const won = new Intl.NumberFormat('ko-KR');

// 서버 작업 순서에 맞춘 대기 단계. 시작 시각은 평균 소요 시간 기준
const STEPS: Array<[number, string]> = [
  [0, '사진에서 옷 특징 읽는 중'],
  [6, '쇼핑몰에서 비슷한 제품 검색하는 중'],
  [16, '가격과 판매 여부 확인하는 중'],
];

function FindWait() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const current = STEPS.reduce((at, [from], index) => (seconds >= from ? index : at), 0);
  return (
    <>
      <ModiState title="더 싼 제품을 찾는 중이에요">
        <ul className="steps" role="status">
          {STEPS.map(([, label], index) => (
            <m.li key={label} className={`steps__item${index === current ? ' is-now' : index < current ? ' is-done' : ''}`} animate={{ opacity: index > current ? 0.55 : 1, x: index === current ? 4 : 0 }}>
              <span className="steps__mark" aria-hidden="true">
                {index < current && (
                  <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ display: 'grid' }}>
                    <CheckIcon width={14} height={14} />
                  </m.span>
                )}
              </span>
              {label}
            </m.li>
          ))}
        </ul>
        <p className="steps__time">{seconds}초 지났어요. 보통 20초에서 30초 걸려요.</p>
      </ModiState>
      <div className="finds__list">
        <FindCardSkeleton />
        <FindCardSkeleton />
      </div>
    </>
  );
}

interface FindCardsProps {
  state: Exclude<FindState, { kind: 'idle' }>;
  selectedUrl: string | null;
  onSelect: (item: FindItem) => void;
  // 간단히: AI 해석 문장, 가격 안내 문구, 자세히 보기를 빼고 제품만 보여 줌
  compact?: boolean;
}

export function FindCards({ state, selectedUrl, onSelect, compact = false }: FindCardsProps) {
  if (state.kind === 'loading') return <FindWait />;
  if (state.kind === 'unavailable') {
    return <p className="note note--warn">데모 모드에서는 AI 제품 찾기를 쓸 수 없어요. 서버에 연결하면 실제 판매 중인 제품을 찾아 드려요.</p>;
  }
  if (state.kind === 'error') {
    return (
      <ModiState pose="sorry" title="제품을 찾지 못했어요">
        {state.message} 아래 쇼핑몰 검색으로 직접 찾아볼 수 있어요.
      </ModiState>
    );
  }
  const { result } = state;
  const originalPrice = result.original?.price ?? null;
  return (
    <div className="finds">
      {!compact && result.analysis && <p className="finds__analysis">{result.analysis}</p>}
      {!compact && result.original?.name && originalPrice !== null && (
        <p className="finds__original">
          올린 옷으로 본 제품: {result.original.name}, {won.format(originalPrice)}원
        </p>
      )}
      {result.items.length > 0 && (
        <m.ul className="finds__list" variants={list} initial="hidden" animate="show">
          {result.items.map((item) => (
            <FindCard key={item.url} item={item} originalPrice={originalPrice} selected={item.url === selectedUrl} onSelect={() => onSelect(item)} compact={compact} />
          ))}
        </m.ul>
      )}
      {result.items.length === 0 && (compact || result.warnings.length === 0) && <p className="note">조건에 맞는 더 싼 제품을 찾지 못했어요. 아래 쇼핑몰 검색으로 직접 찾아볼 수 있어요.</p>}
      {!compact && result.warnings.map((warning) => (
        <p key={warning} className={result.items.length > 0 ? 'note' : 'note note--warn'}>
          {warning}
        </p>
      ))}
      {!compact && <p className="source-line">{result.aiAvailable ? 'AI가 웹에서 찾은 결과예요. 가격은 검색 시점 기준이라 상품 페이지에서 다시 확인해 주세요.' : 'AI 연결이 안 돼서 쇼핑몰 검색 링크로 대신했어요.'}</p>}
    </div>
  );
}

// 상품 사진을 못 가져온 카드(무신사는 서버 요청을 막아 대부분 사진이 없음)에 보여 줄 쇼핑몰 표시. 주소의 도메인으로 고른다
const MALL_LOGOS: Array<{ domain: string; label: string; bg: string; fg: string }> = [
  { domain: 'musinsa.com', label: 'MUSINSA', bg: '#000000', fg: '#ffffff' },
  { domain: '29cm.co.kr', label: '29CM', bg: '#111111', fg: '#ffffff' },
  { domain: 'zigzag.kr', label: 'zigzag', bg: '#ff4b8b', fg: '#ffffff' },
  { domain: 'wconcept.co.kr', label: 'W CONCEPT', bg: '#ffffff', fg: '#000000' },
  { domain: 'ssg.com', label: 'SSG.COM', bg: '#ffd400', fg: '#111111' },
  { domain: 'lotteon.com', label: 'LOTTE ON', bg: '#e60012', fg: '#ffffff' },
  { domain: '11st.co.kr', label: '11st', bg: '#ff0038', fg: '#ffffff' },
  { domain: 'coupang.com', label: 'coupang', bg: '#ffffff', fg: '#e52528' },
];

function MallLogo({ url, mall }: { url: string; mall: string }) {
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    host = '';
  }
  const logo = MALL_LOGOS.find((l) => host === l.domain || host.endsWith(`.${l.domain}`));
  if (!logo) return <span aria-hidden="true">{mall}</span>;
  return (
    <span className="find-card__logo" style={{ background: logo.bg, color: logo.fg }} aria-hidden="true">
      {logo.label}
    </span>
  );
}

function FindCard({ item, originalPrice, selected, onSelect, compact }: { item: FindItem; originalPrice: number | null; selected: boolean; onSelect: () => void; compact: boolean }) {
  const saved = originalPrice !== null && originalPrice > item.price ? originalPrice - item.price : null;
  const body = (
    <>
      <span className="find-card__thumb">
        {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <MallLogo url={item.url} mall={item.mall} />}
      </span>
      <span className="find-card__body">
        <span className="find-card__mall">{item.mall}</span>
        <span className="find-card__name">{item.name}</span>
        <span className="find-card__price">
          {won.format(item.price)}원{saved !== null && <em className="find-card__saved">{won.format(saved)}원 저렴</em>}
        </span>
        <span className="find-card__reason">{item.reason}</span>
      </span>
    </>
  );
  return (
    <m.li className={`find-card${selected ? ' is-on' : ''}`} variants={listItem}>
      {/* 사진이 있는 제품만 보드에 넣어 볼 수 있음 */}
      {item.imageUrl ? (
        <m.button type="button" className="find-card__main" whileTap={TAP} aria-pressed={selected} onClick={onSelect}>
          {body}
        </m.button>
      ) : (
        <div className="find-card__main">{body}</div>
      )}
      <div className="find-card__foot">
        {!compact && item.size ? (
          <details className="find-card__more">
            <summary>자세히 보기</summary>
            <p>추천 사이즈 {item.size}</p>
          </details>
        ) : (
          <span />
        )}
        <a className="button button--small" href={item.url} target="_blank" rel="noreferrer">
          상품 페이지 열기
        </a>
      </div>
    </m.li>
  );
}
