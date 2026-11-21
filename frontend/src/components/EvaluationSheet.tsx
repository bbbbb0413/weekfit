// 기능: 옷 평가 결과. 날씨, 일정, 색 조합, 세탁 상태 점수 & 교체 제안

import type { Clothing, OutfitEvaluation } from '../api/types';
import { itemLabel } from '../lib/labels';
import { AlertIcon, CheckIcon, SwapIcon } from './icons';
import { ItemFigure } from './ItemFigure';
import { Sheet } from './Sheet';

const GRADE_LABEL: Record<OutfitEvaluation['grade'], string> = {
  GREAT: '이대로 나가도 좋아요',
  GOOD: '무난하게 잘 맞아요',
  FAIR: '한두 군데만 바꿔보세요',
  POOR: '다시 골라보는 게 좋아요',
};

const CHECK_LABEL = { weather: '날씨', tpo: '일정', color: '색 조합', laundry: '세탁 상태' } as const;

interface EvaluationSheetProps {
  evaluation: OutfitEvaluation;
  closet: Clothing[];
  basis: string;
  // fromId 가 null 이면 벗는 옷 없이 to 를 더해 입음
  onReplace: (fromId: string | null, to: Clothing) => void;
  onClose: () => void;
}

export function EvaluationSheet({ evaluation, closet, basis, onReplace, onClose }: EvaluationSheetProps) {
  const byId = (id: string | null) => (id ? closet.find((c) => c.id === id) : undefined);
  const warnings = evaluation.warnings ?? [];
  return (
    <Sheet title="옷 평가" onClose={onClose}>
      <div className={`score score--${evaluation.grade.toLowerCase()}`}>
        <div className="score__number" aria-label={`총점 ${evaluation.score}점`}>
          {evaluation.score}
        </div>
        <div>
          <p className="score__grade">{GRADE_LABEL[evaluation.grade]}</p>
          <p className="score__basis">{basis}</p>
        </div>
      </div>

      <p className="summary">{evaluation.summary}</p>

      <ul className="checks">
        {(Object.keys(CHECK_LABEL) as Array<keyof typeof CHECK_LABEL>).map((key) => {
          const check = evaluation.checks[key];
          return (
            <li key={key} className={`check${check.ok ? ' is-ok' : ' is-off'}`}>
              <span className="check__mark" aria-hidden="true">
                {check.ok ? <CheckIcon width={18} height={18} /> : <AlertIcon width={18} height={18} />}
              </span>
              <div className="check__text">
                <p className="check__title">
                  {CHECK_LABEL[key]}
                  <span className="visually-hidden">{check.ok ? ', 통과' : ', 확인 필요'}</span>
                </p>
                <p className="check__message">{check.message}</p>
              </div>
              <span className="check__score">{check.score}</span>
            </li>
          );
        })}
      </ul>

      {warnings.map((warning) => (
        <p key={warning} className="note note--warn">
          {warning}
        </p>
      ))}

      {evaluation.suggestions.length > 0 && (
        <section className="swaps" aria-label="바꿔 입기 제안">
          <h3 className="section-title">이렇게 바꿔보세요</h3>
          <ul>
            {evaluation.suggestions.map((s, index) => {
              const from = byId(s.replaceItemId);
              const to = byId(s.withItemId);
              // 서버가 옷 없이 이유만 주거나 옷장에서 찾지 못한 경우 문장만 표시
              if (!from && !to) {
                return (
                  <li key={index} className="swap">
                    <div className="swap__text">
                      <p className="swap__reason">{s.reason}</p>
                    </div>
                  </li>
                );
              }
              return (
                <li key={index} className="swap">
                  <div className="swap__pair">
                    {from && (
                      <span className="swap__item">
                        <ItemFigure item={from} />
                      </span>
                    )}
                    {from && to && <SwapIcon aria-hidden="true" />}
                    {to && (
                      <span className="swap__item">
                        <ItemFigure item={to} />
                      </span>
                    )}
                  </div>
                  <div className="swap__text">
                    {from && to && (
                      <p>
                        {itemLabel(from)} 대신 <strong>{itemLabel(to)}</strong>
                      </p>
                    )}
                    {!from && to && (
                      <p>
                        <strong>{itemLabel(to)}</strong> 더해 입기
                      </p>
                    )}
                    {from && !to && <p>{itemLabel(from)} 대신 입을 옷이 옷장에 없어요</p>}
                    <p className="swap__reason">{s.reason}</p>
                  </div>
                  {to && (
                    <button type="button" className="button button--small" onClick={() => onReplace(from?.id ?? null, to)}>
                      {from ? '바꿔 입기' : '더해 입기'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!evaluation.aiAvailable && <p className="note">AI 연결 없이 규칙으로만 평가한 결과예요.</p>}
    </Sheet>
  );
}
