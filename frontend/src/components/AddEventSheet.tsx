// 기능: 일정 넣기. 직접 입력(마스킹 결과 미리보기 포함) 또는 캘린더 파일(.ics)로 이번 주 일정 한 번에 가져오기

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { api } from '../api';
import type { MaskPreview } from '../api/types';
import { addDays, dateOfIso, formatMonthDay, toLocalIso } from '../lib/date';
import { parseIcs } from '../lib/ics';
import { useCreateEvent, useSyncEvents } from '../hooks/queries';
import { Sheet } from './Sheet';
import { Spinner } from './Skeleton';
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
  const sync = useSyncEvents();
  const fileRef = useRef<HTMLInputElement>(null);

  // 캘린더에서 내보낸 파일의 이번 주 일정을 가져옴. 이번 주의 기존 일정은 가져온 일정으로 바뀜
  const importCalendar = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) return;
    const end = addDays(start, 6);
    const events = parseIcs(await picked.text())
      .filter((e) => dateOfIso(e.startsAt) >= start && dateOfIso(e.startsAt) <= end)
      .slice(0, 100);
    if (events.length === 0) {
      setError('파일에 이번 주 일정이 없어요.');
      return;
    }
    if (!window.confirm(`이번 주 일정 ${events.length}개를 가져올까요? 지금 있는 이번 주 일정은 가져온 일정으로 바뀌어요.`)) return;
    sync
      .mutateAsync({ from: start, to: end, events })
      .then(() => {
        toast(`일정 ${events.length}개를 가져오고 계획을 다시 짰어요.`);
        onClose();
      })
      .catch((e: Error) => setError(e.message));
  };

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
          {create.isPending && <Spinner />}
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
      <div className="sheet__extra">
        <input ref={fileRef} className="visually-hidden" type="file" accept=".ics,text/calendar" aria-label="캘린더 파일 고르기" onChange={importCalendar} />
        <button type="button" className="text-button" disabled={sync.isPending} onClick={() => fileRef.current?.click()}>
          {sync.isPending ? '가져오는 중' : '캘린더 파일로 한 번에 넣기'}
        </button>
        구글 캘린더나 기기 캘린더에서 내보낸 .ics 파일의 이번 주 일정을 가져와요.
      </div>
    </Sheet>
  );
}
