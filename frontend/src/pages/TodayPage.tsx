// 기능: 오늘 화면. 모디가 고른 코디 보드, 고른 이유, 바꿔 입기, 착용 기록

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { API_MODE, api } from '../api';
import type { CalendarEvent, Clothing, OutfitEvaluation, OutfitSlot, WeatherCondition } from '../api/types';
import logo from '../assets/modi/logo.webp';
import { ModiNote, ModiState, lookFor, todayLine } from '../components/ModiNote';
import { OutfitBoard, pieceOf, type Pieces } from '../components/OutfitBoard';
import { PickSheet } from '../components/PickSheet';
import { WearSheet } from '../components/WearSheet';
import { WeatherBand } from '../components/WeatherBand';
import { AlertIcon } from '../components/icons';
import { useClothes, useEvaluation, useEvents, useWeather, useWeekPlan } from '../hooks/queries';
import { formatMonthDay, formatTime, today } from '../lib/date';
import { CONDITION_LABEL, TPO_LABEL, itemLabel, slotOf } from '../lib/labels';
import { useOutfit, wornIds } from '../store/outfit';

const PREVIEW_ORDER: WeatherCondition[] = ['CLEAR', 'CLOUDY', 'RAIN', 'SNOW', 'FOG', 'THUNDER'];

const GRADE_LABEL: Record<OutfitEvaluation['grade'], string> = {
  GREAT: '이대로 나가도 좋아요',
  GOOD: '무난하게 잘 맞아요',
  FAIR: '한두 군데만 바꿔 보세요',
  POOR: '다시 골라 보는 게 좋아요',
};

const CHECKS = [
  ['weather', '날씨'],
  ['tpo', '일정'],
  ['color', '색 조합'],
  ['laundry', '세탁'],
] as const;

export function TodayPage() {
  const date = today();
  const clothes = useClothes();
  const weather = useWeather();
  const events = useEvents(date, date);
  const plan = useWeekPlan(date);
  const { worn, custom, wornOn, put, remove, follow } = useOutfit();
  const queryClient = useQueryClient();

  const [picking, setPicking] = useState<OutfitSlot | null>(null);
  const [recording, setRecording] = useState(false);
  const [preview, setPreview] = useState<WeatherCondition | ''>(api.demoWeather() ?? '');

  const closet = clothes.data ?? [];
  const day = plan.data?.days.find((d) => d.date === date) ?? null;
  const planned = useMemo(() => day?.outfit?.items.map((entry) => entry.item) ?? [], [day]);
  const plannedKey = planned.map((item) => item.id).join();

  // 직접 바꾸기 전까지는 추천 코디를 따라감
  useEffect(() => {
    if (!custom && plannedKey) follow(planned);
  }, [custom, plannedKey, planned, follow]);

  const ids = wornIds(worn);
  const pieces = useMemo(
    () =>
      closet.reduce<Pieces>((board, item) => {
        const slot = slotOf(item.category);
        return slot && worn[slot] === item.id ? { ...board, [slot]: pieceOf(item) } : board;
      }, {}),
    [closet, worn],
  );
  const wornItems = closet.filter((c) => ids.includes(c.id));
  const hasBase = Boolean(worn.DRESS || (worn.TOP && worn.BOTTOM));

  const event = (events.data ?? []).reduce<CalendarEvent | null>(
    (top, e) => (!top || e.analysis.importance > top.analysis.importance ? e : top),
    null,
  );
  const current = weather.data?.current;
  const evaluation = useEvaluation(ids, date, event?.id, hasBase);
  const result = evaluation.data;
  const byId = (id: string | null) => (id ? closet.find((c) => c.id === id) : undefined);

  // 데모에서 날씨를 바꾸면 띠, 추천, 평가가 함께 바뀜
  const changePreview = (value: WeatherCondition | '') => {
    setPreview(value);
    api.setDemoWeather(value || null);
    useOutfit.setState({ custom: false });
    queryClient.invalidateQueries({ queryKey: ['weather'] });
    queryClient.invalidateQueries({ queryKey: ['weekPlan'] });
    queryClient.invalidateQueries({ queryKey: ['evaluation'] });
  };

  const pick = (item: Clothing) => {
    if (!ids.includes(item.id)) put(item);
    setPicking(null);
  };

  const done = wornOn === date;
  const loading = clothes.isPending || plan.isPending;

  return (
    <div className="page page--today">
      <header className="top">
        <img className="top__logo" src={logo} alt="modi" />
        {API_MODE === 'mock' && (
          <label className="top__preview">
            <span className="visually-hidden">날씨 바꿔 보기</span>
            <select value={preview} onChange={(e) => changePreview(e.target.value as WeatherCondition | '')}>
              <option value="">오늘 날씨</option>
              {PREVIEW_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_LABEL[c]}일 때
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      <WeatherBand date={formatMonthDay(date)} weather={current} failed={weather.isError} />

      <p className="event-line">
        {event ? (
          <>
            <span className="event-line__time">{formatTime(event.startsAt)}</span>
            <span className="event-line__title">{event.title}</span>
            <span className="event-line__tpo">{event.analysis.dressCode ?? TPO_LABEL[event.analysis.tpo]}</span>
          </>
        ) : (
          <>
            <span className="event-line__title">일정 없는 날</span>
            <Link className="event-line__link" to="/week">
              일정 추가
            </Link>
          </>
        )}
      </p>

      {loading && (
        <>
          <ModiNote look={lookFor(current)}>옷장과 날씨, 일정을 보고 오늘 코디를 고르는 중이에요.</ModiNote>
          <div className="board board--loading" aria-hidden="true">
            <span className="board__slot board__slot--outer" />
            <span className="board__slot board__slot--top" />
            <span className="board__slot board__slot--bottom" />
            <span className="board__slot board__slot--shoes" />
          </div>
        </>
      )}

      {!loading && (clothes.isError || plan.isError) && (
        <ModiState
          title="코디를 불러오지 못했어요"
          action={
            <button type="button" className="button" onClick={() => (clothes.refetch(), plan.refetch())}>
              다시 불러오기
            </button>
          }
        >
          {((clothes.error ?? plan.error) as Error).message}
        </ModiState>
      )}

      {!loading && !clothes.isError && !plan.isError && closet.length === 0 && (
        <ModiState
          title="옷장이 비어 있어요"
          action={
            <Link className="button button--primary" to="/closet">
              옷 등록하러 가기
            </Link>
          }
        >
          상의, 하의, 신발을 한 벌씩만 등록해도 모디가 오늘 코디를 골라요.
        </ModiState>
      )}

      {!loading && !plan.isError && closet.length > 0 && (
        <>
          <ModiNote look={lookFor(current)}>{done ? '오늘 코디를 기록했어요. 체감은 다음 추천 두께에 반영돼요.' : custom ? '바꾼 조합으로 다시 살펴봤어요.' : todayLine(current, event)}</ModiNote>

          <OutfitBoard pieces={pieces} onSlot={setPicking} busy={evaluation.isFetching} />

          {custom && !done && planned.length > 0 && (
            <button type="button" className="text-button" onClick={() => follow(planned)}>
              모디 추천으로 되돌리기
            </button>
          )}

          {!hasBase && <p className="note">{day?.outfit ? '상의와 하의를 넣으면 점수를 볼 수 있어요.' : (day?.reason ?? '상의와 하의를 넣으면 점수를 볼 수 있어요.')}</p>}

          {hasBase && evaluation.isError && <p className="note note--bad">{(evaluation.error as Error).message}</p>}

          {hasBase && !result && evaluation.isPending && <p className="note">점수를 계산하는 중이에요.</p>}

          {hasBase && result && (
            <section className="verdict" aria-label="코디 평가" aria-busy={evaluation.isFetching}>
              <div className="verdict__head">
                <p className="verdict__score">
                  <strong>{result.score}</strong>점
                </p>
                <p className="verdict__grade">{GRADE_LABEL[result.grade]}</p>
                <p className="verdict__source">{result.aiAvailable ? 'AI 평가' : '규칙 평가'}</p>
              </div>
              <p className="verdict__summary">{custom || !day?.reason ? result.summary : day.reason}</p>

              <h2 className="section-title">고른 이유</h2>
              <dl className="reasons">
                {CHECKS.map(([key, label]) => {
                  const check = result.checks[key];
                  return (
                    <div key={key} className={`reason${check.ok ? '' : ' is-off'}`}>
                      <dt>{label}</dt>
                      <dd>{check.message}</dd>
                      <dd className="reason__score" aria-label={`${check.score}점`}>
                        {check.score}
                      </dd>
                    </div>
                  );
                })}
                {!custom && day?.layeringTip && (
                  <div className="reason">
                    <dt>시간대</dt>
                    <dd>{day.layeringTip}</dd>
                  </div>
                )}
              </dl>

              {[...(result.warnings ?? []), ...(custom ? [] : (day?.warnings ?? []))].map((warning) => (
                <p key={warning} className="caution">
                  <AlertIcon width={16} height={16} /> {warning}
                </p>
              ))}

              {result.suggestions.length > 0 && (
                <>
                  <h2 className="section-title">이렇게 바꾸면 더 좋아요</h2>
                  <ul className="swaps">
                    {result.suggestions.map((s, index) => {
                      const from = byId(s.replaceItemId);
                      const to = byId(s.withItemId);
                      return (
                        <li key={index} className="swap">
                          <div className="swap__text">
                            {to && (
                              <p className="swap__title">
                                {from ? `${itemLabel(from)} 대신 ${itemLabel(to)}` : `${itemLabel(to)} 더해 입기`}
                              </p>
                            )}
                            <p className="swap__reason">{s.reason}</p>
                          </div>
                          {to && (
                            <button type="button" className="button button--small" onClick={() => put(to)}>
                              {from ? '바꿔 입기' : '더해 입기'}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>
          )}

          <div className="actions">
            {done ? (
              <p className="actions__done">
                오늘 입은 옷으로 기록했어요.
                <button type="button" className="text-button" onClick={() => setRecording(true)}>
                  다시 기록
                </button>
              </p>
            ) : (
              <button type="button" className="button button--primary button--block" disabled={!hasBase} onClick={() => setRecording(true)}>
                오늘 이 옷 입기
              </button>
            )}
          </div>
        </>
      )}

      {picking && (
        <PickSheet
          slot={picking}
          closet={closet}
          currentId={worn[picking]}
          onPick={pick}
          onRemove={() => (remove(picking), setPicking(null))}
          onClose={() => setPicking(null)}
        />
      )}
      {recording && <WearSheet items={wornItems} onClose={() => setRecording(false)} />}
    </div>
  );
}
