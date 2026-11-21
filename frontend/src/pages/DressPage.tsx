// 기능: 옷방. 날씨 창문 앞 인형에 옷을 입혀 보고 평가받는 메인 화면

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { API_MODE, api } from '../api';
import type { CalendarEvent, Category, Clothing, OutfitEvaluation, WeatherCondition } from '../api/types';
import { AddClothingSheet } from '../components/AddClothingSheet';
import { ClosetRack, rackCategories } from '../components/ClosetRack';
import { EvaluationSheet } from '../components/EvaluationSheet';
import { ItemSheet } from '../components/ItemSheet';
import { Stage } from '../components/Stage';
import { useToast } from '../components/Toast';
import { WearSheet } from '../components/WearSheet';
import { useClothes, useEvents, useWeather } from '../hooks/queries';
import { formatMonthDay, formatTime, today } from '../lib/date';
import { CONDITION_LABEL, TPO_LABEL } from '../lib/labels';
import { useOutfit, wornIds } from '../store/outfit';

const PREVIEW_ORDER: WeatherCondition[] = ['CLEAR', 'CLOUDY', 'RAIN', 'SNOW', 'FOG', 'THUNDER'];

function mainEvent(events: CalendarEvent[]): CalendarEvent | null {
  return events.reduce<CalendarEvent | null>((top, e) => (!top || e.analysis.importance > top.analysis.importance ? e : top), null);
}

export function DressPage() {
  const date = today();
  const clothes = useClothes();
  const weather = useWeather();
  const events = useEvents(date, date);
  const { worn, toggle, replace, clear } = useOutfit();
  const toast = useToast((s) => s.show);

  const [managing, setManaging] = useState<Clothing | null>(null);
  const [adding, setAdding] = useState(false);
  const [recording, setRecording] = useState(false);
  const [evaluation, setEvaluation] = useState<OutfitEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [category, setCategory] = useState<Category>('TOP');
  const [preview, setPreview] = useState<WeatherCondition | ''>(api.demoWeather() ?? '');
  const queryClient = useQueryClient();

  const closet = clothes.data ?? [];
  const ids = wornIds(worn);
  const wornItems = useMemo(() => closet.filter((c) => ids.includes(c.id)), [closet, ids]);
  const event = mainEvent(events.data ?? []);
  const current = weather.data?.current;
  const condition = current?.condition ?? 'CLOUDY';

  const categories = rackCategories(closet);
  const activeCategory = categories.includes(category) ? category : categories[0];
  const rackItems = useMemo(() => closet.filter((c) => c.category === activeCategory), [closet, activeCategory]);

  // 데모에서 날씨를 바꿔 보면 창밖 효과 & 평가 & 주간 계획이 함께 바뀜
  const changePreview = (value: WeatherCondition | '') => {
    setPreview(value);
    api.setDemoWeather(value || null);
    queryClient.invalidateQueries({ queryKey: ['weather'] });
    queryClient.invalidateQueries({ queryKey: ['weekPlan'] });
  };

  const hasBase = Boolean(worn.DRESS || (worn.TOP && worn.BOTTOM));
  const basis = event ? `${formatTime(event.startsAt)} ${event.title} 기준` : '오늘 날씨와 일상 차림 기준';

  const evaluate = async (itemIds: string[]) => {
    setEvaluating(true);
    try {
      setEvaluation(await api.evaluate({ itemIds, date, eventId: event?.id }));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setEvaluating(false);
    }
  };

  const swap = (fromId: string | null, to: Clothing) => {
    if (fromId) replace(fromId, to);
    else if (!ids.includes(to.id)) toggle(to);
    // 같은 자리 옷이 밀려날 수 있어 바뀐 뒤의 착용 목록으로 다시 평가
    evaluate(wornIds(useOutfit.getState().worn));
  };

  return (
    <div className="page page--dress">
      <header className="today">
        <div>
          <h1 className="today__date">{formatMonthDay(date)}</h1>
          {event ? (
            <p className="today__event">
              <span className="today__time">{formatTime(event.startsAt)}</span> {event.title}
              <span className="tag">{event.analysis.dressCode ?? TPO_LABEL[event.analysis.tpo]}</span>
            </p>
          ) : (
            <p className="today__event">
              오늘은 일정이 없어요. <Link to="/week">일정 추가</Link>
            </p>
          )}
        </div>
        {current ? (
          <div className="today__weather">
            <span className="today__temp">{Math.round(current.temperature)}°</span>
            <span className="today__cond">
              {CONDITION_LABEL[current.condition]}, 체감 {Math.round(current.apparentTemperature)}°
              <br />
              강수 확률 {current.precipitationProbability}%
            </span>
          </div>
        ) : (
          <div className="today__weather">
            <span className="today__cond">{weather.isError ? '날씨를 불러오지 못했어요' : '날씨 확인 중'}</span>
          </div>
        )}
      </header>

      <Stage condition={condition} worn={wornItems} rack={rackItems} wornIds={ids} onPick={toggle}>
        {API_MODE === 'mock' && (
          <label className="stage__preview">
            <span className="visually-hidden">날씨 미리보기</span>
            <select value={preview} onChange={(e) => changePreview(e.target.value as WeatherCondition | '')}>
              <option value="">오늘 날씨</option>
              {PREVIEW_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_LABEL[c]} 미리보기
                </option>
              ))}
            </select>
          </label>
        )}
        {!hasBase && <p className="stage__hint">{ids.length === 0 ? '행거에서 옷을 눌러 입혀보세요' : '상의와 하의를 입히면 평가할 수 있어요'}</p>}
        {hasBase && (
          <button type="button" className="stage__clear" onClick={clear}>
            모두 벗기기
          </button>
        )}
      </Stage>

      {clothes.isError ? (
        <p className="note note--bad page__note">{(clothes.error as Error).message}</p>
      ) : (
        <ClosetRack items={closet} category={activeCategory} onCategory={setCategory} wornIds={ids} onToggle={toggle} onManage={setManaging} onAdd={() => setAdding(true)} />
      )}

      <div className="actions">
        <div className="actions__row">
          <button type="button" className="button" disabled={ids.length === 0} onClick={() => setRecording(true)}>
            오늘 입음
          </button>
          <button type="button" className="button button--accent" disabled={!hasBase || evaluating} onClick={() => evaluate(ids)}>
            {evaluating ? '평가하는 중' : '옷 평가'}
          </button>
        </div>
      </div>

      {managing && <ItemSheet item={managing} onClose={() => setManaging(null)} />}
      {adding && <AddClothingSheet onClose={() => setAdding(false)} />}
      {recording && <WearSheet items={wornItems} onClose={() => setRecording(false)} />}
      {evaluation && (
        <EvaluationSheet evaluation={evaluation} closet={closet} basis={basis} onReplace={swap} onClose={() => setEvaluation(null)} />
      )}
    </div>
  );
}
