// 기능: 오늘 입은 옷 기록 & 체감 피드백

import { useState } from 'react';
import type { Clothing, ThermalFeedback } from '../api/types';
import { itemLabel } from '../lib/labels';
import { today } from '../lib/date';
import { useRecordWear } from '../hooks/queries';
import { Sheet } from './Sheet';
import { useToast } from './Toast';
import { useOutfit } from '../store/outfit';

const FEEDBACK: Array<{ value: ThermalFeedback; label: string }> = [
  { value: 'COLD', label: '추웠어요' },
  { value: 'OK', label: '괜찮았어요' },
  { value: 'HOT', label: '더웠어요' },
];

export function WearSheet({ items, onClose }: { items: Clothing[]; onClose: () => void }) {
  const record = useRecordWear();
  const toast = useToast((s) => s.show);
  const markWorn = useOutfit((s) => s.markWorn);
  const [feedback, setFeedback] = useState<ThermalFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = () =>
    record
      .mutateAsync({ date: today(), itemIds: items.map((i) => i.id), feedback: feedback ?? undefined })
      .then(() => {
        markWorn(today());
        toast(feedback ? '기록했어요. 체감은 다음 추천의 두께에 반영돼요.' : '오늘 입은 옷으로 기록했어요.');
        onClose();
      })
      .catch((e: Error) => setError(e.message));

  return (
    <Sheet
      title="오늘 이 옷 입기"
      onClose={onClose}
      footer={
        <button type="button" className="button button--primary button--block" disabled={record.isPending} onClick={save}>
          {record.isPending ? '기록하는 중' : '기록하기'}
        </button>
      }
    >
      <p className="summary">입은 횟수가 한 번씩 올라가고, 세탁할 때가 되면 알려드려요.</p>
      <ul className="plain-list">
        {items.map((item) => (
          <li key={item.id}>{itemLabel(item)}</li>
        ))}
      </ul>
      <fieldset className="field">
        <legend className="field__label">입어 보니 어땠나요? 저녁에 다시 기록해도 돼요</legend>
        <div className="choices">
          {FEEDBACK.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`choice${feedback === f.value ? ' is-on' : ''}`}
              aria-pressed={feedback === f.value}
              onClick={() => setFeedback(feedback === f.value ? null : f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </fieldset>
      {error && <p className="note note--bad">{error}</p>}
    </Sheet>
  );
}
