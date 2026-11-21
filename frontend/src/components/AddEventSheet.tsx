// 기능: 일정 직접 입력. AI 에 전달될 마스킹 결과 미리보기 포함

import { useEffect, useState } from 'react';
import { api } from '../api';
import type { MaskPreview } from '../api/types';
import { addDays, formatMonthDay, toLocalIso } from '../lib/date';
import { useCreateEvent } from '../hooks/queries';
import { Sheet } from './Sheet';
import { useToast } from './Toast';

export function AddEventSheet({ start, onClose }: { start: string; onClose: () => void }) {
  const create = useCreateEvent();
  const toast = useToast((s) => s.show);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(start);
  const [from, setFrom] = useState('10:00');
  const [to, setTo] = useState('11:00');
  const [preview, setPreview] = useState<MaskPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 입력이 멈추면 가려질 내용을 확인
  useEffect(() => {
    if (!title.trim()) {
      setPreview(null);
      return;
    }
    const timer = setTimeout(() => {
      api
        .maskPreview(title, location || undefined)
        .then(setPreview)
        .catch(() => setPreview(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [title, location]);

  const save = () => {
    if (to <= from) {
      setError('끝나는 시간이 시작 시간보다 늦어야 해요.');
      return;
    }
    create
      .mutateAsync({ title: title.trim(), location: location.trim() || null, startsAt: toLocalIso(date, from), endsAt: toLocalIso(date, to) })
      .then(() => {
        toast('일정을 추가하고 계획을 다시 짰어요.');
        onClose();
      })
      .catch((e: Error) => setError(e.message));
  };

  return (
    <Sheet
      title="일정 추가"
      onClose={onClose}
      footer={
        <button type="button" className="button button--primary button--block" disabled={!title.trim() || create.isPending} onClick={save}>
          {create.isPending ? '추가하는 중' : '일정 추가'}
        </button>
      }
    >
      <div className="form">
        <label className="field">
          <span className="field__label">일정 이름</span>
          <input className="input" value={title} maxLength={200} placeholder="대학 동기 결혼식" onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">장소 (선택)</span>
          <input className="input" value={location} maxLength={200} placeholder="더채플 청담" onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">날짜</span>
          <select className="input" value={date} onChange={(e) => setDate(e.target.value)}>
            {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => (
              <option key={d} value={d}>
                {formatMonthDay(d)}
              </option>
            ))}
          </select>
        </label>
        <div className="field-row">
          <label className="field">
            <span className="field__label">시작</span>
            <input className="input" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">끝</span>
            <input className="input" type="time" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        {preview && preview.maskedCount > 0 && (
          <p className="note">
            이름과 연락처 {preview.maskedCount}곳을 가리고 저장해요. AI에는 "{preview.title}"로 전달돼요.
          </p>
        )}
        {error && <p className="note note--bad">{error}</p>}
      </div>
    </Sheet>
  );
}
