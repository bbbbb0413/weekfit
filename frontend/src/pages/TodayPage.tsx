// 기능: 오늘 화면. 모디가 고른 코디 보드, 고른 이유, 바꿔 입기, 착용 기록

import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { API_MODE, api } from '../api';
import type { CalendarEvent, Clothing, DayPlan, OutfitEvaluation, OutfitSlot, Tpo, WeatherCondition } from '../api/types';
import logo from '../assets/modi/logo.webp';
import { CountUp } from '../components/CountUp';
import { ModiNote, ModiState, poseFor, todayLine } from '../components/ModiNote';
import { OutfitBoard, pieceOf, type Pieces } from '../components/OutfitBoard';
import { PickSheet } from '../components/PickSheet';
import { BoardSkeleton, EventLineSkeleton, Spinner, VerdictSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { WearSheet } from '../components/WearSheet';
import { WeatherBand } from '../components/WeatherBand';
import { AlertIcon } from '../components/icons';
import { useClothes, useEvaluation, useEvents, useWearLogs, useWeather, useWeekPlan } from '../hooks/queries';
import { formatMonthDay, formatTime, today } from '../lib/date';
import { TPO_LABEL, itemLabel, slotOf } from '../lib/labels';
import { TAP, fadeUp, list, listItem } from '../lib/motion';
import { place, setPlace } from '../lib/session';
import { useOutfit, wornIds } from '../store/outfit';

const PREVIEW_ORDER: WeatherCondition[] = ['CLEAR', 'CLOUDY', 'RAIN', 'SNOW', 'FOG', 'THUNDER'];
const PREVIEW_LABEL: Record<WeatherCondition, string> = { CLEAR: '맑을 때', CLOUDY: '흐릴 때', RAIN: '비 내릴 때', SNOW: '눈 내릴 때', FOG: '안개 낄 때', THUNDER: '천둥 칠 때' };

const GRADE_LABEL: Record<OutfitEvaluation['grade'], string> = {
  GREAT: '이대로 나가도 좋아요',
  GOOD: '무난하게 잘 맞아요',
  FAIR: '한두 군데만 바꿔 보세요',
  POOR: '다시 골라 보는 게 좋아요',
};

// 일정이 어떤 자리인지 모호할 때 고르는 옷차림 기준
const TPO_CHOICES: Tpo[] = ['DAILY', 'WORK', 'FORMAL', 'DATE', 'OUTDOOR', 'EXERCISE'];

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
  // 옷차림 기준을 고르거나 꼭 입을 옷을 정해 다시 받은 하루 추천
  const [replan, setReplan] = useState<DayPlan | null>(null);
  const [tpoChoice, setTpoChoice] = useState<Tpo | null>(null);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [replanning, setReplanning] = useState(false);
  const [located, setLocated] = useState(() => place() !== null);
  const [locating, setLocating] = useState(false);
  const logs = useWearLogs(date);
  const toast = useToast((s) => s.show);

  const closet = clothes.data ?? [];
  const day = replan ?? plan.data?.days.find((d) => d.date === date) ?? null;
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
  const evaluation = useEvaluation(ids, date, event?.id, hasBase, tpoChoice ?? undefined);
  const result = evaluation.data;
  const byId = (id: string | null) => (id ? closet.find((c) => c.id === id) : undefined);

  const refreshAll = () => {
    setReplan(null);
    useOutfit.setState({ custom: false });
    queryClient.invalidateQueries({ queryKey: ['weather'] });
    queryClient.invalidateQueries({ queryKey: ['weekPlan'] });
    queryClient.invalidateQueries({ queryKey: ['evaluation'] });
  };

  // 데모에서 날씨를 바꾸면 띠, 추천, 평가가 함께 바뀜
  const changePreview = (value: WeatherCondition | '') => {
    setPreview(value);
    api.setDemoWeather(value || null);
    refreshAll();
  };

  const pick = (item: Clothing) => {
    if (!ids.includes(item.id)) {
      put(item);
      setAnchorId(item.id);
    }
    setPicking(null);
  };

  // 하루 추천을 다시 받아 보드에 올림
  const replanDay = async (request: { tpo?: Tpo; anchorItemId?: string }) => {
    setReplanning(true);
    try {
      const next = await api.planDay({ date, tpo: request.tpo ?? tpoChoice ?? undefined, anchorItemId: request.anchorItemId });
      setReplan(next);
      if (request.tpo) setTpoChoice(request.tpo);
      if (next.outfit) follow(next.outfit.items.map((entry) => entry.item));
      else toast(next.reason);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setReplanning(false);
    }
  };

  // 허락을 받아 현재 위치의 날씨로 바꾸거나 서울 기준으로 되돌림
  const toggleLocation = () => {
    if (located) {
      setPlace(null);
      setLocated(false);
      refreshAll();
      return;
    }
    if (!('geolocation' in navigator)) {
      toast('이 브라우저에서는 위치를 쓸 수 없어요.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPlace({ lat: position.coords.latitude, lon: position.coords.longitude });
        setLocated(true);
        setLocating(false);
        refreshAll();
      },
      () => {
        setLocating(false);
        toast('위치를 확인하지 못했어요. 서울 기준으로 보여 드려요.');
      },
      { timeout: 8000, maximumAge: 600_000 },
    );
  };

  const anchor = closet.find((c) => c.id === anchorId && ids.includes(c.id)) ?? null;
  const question = !tpoChoice ? (event?.analysis.clarifyQuestion ?? null) : null;
  const done = wornOn === date || (logs.data?.length ?? 0) > 0;
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
                  {PREVIEW_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      <WeatherBand
        date={formatMonthDay(date)}
        weather={current}
        failed={weather.isError}
        place={
          <button type="button" className="band__place" disabled={locating} aria-label={located ? '내 위치 기준 날씨. 서울 기준으로 바꾸기' : '서울 기준 날씨. 내 위치로 바꾸기'} onClick={toggleLocation}>
            {locating ? '위치 확인 중' : located ? '내 위치 기준' : '서울 기준'}
          </button>
        }
      />

      {events.isPending ? (
        <EventLineSkeleton />
      ) : (
        <p className="event-line">
          {event ? (
            <>
              <span className="event-line__time">{formatTime(event.startsAt)}</span>
              <span className="event-line__title">{event.title}</span>
              <span className="event-line__tpo">{tpoChoice ? TPO_LABEL[tpoChoice] : (event.analysis.dressCode ?? TPO_LABEL[event.analysis.tpo])}</span>
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
      )}

      {question && (
        <m.div className="ask" variants={fadeUp} initial="hidden" animate="show">
          <p className="ask__question">{question}</p>
          <div className="choices" role="group" aria-label="어떤 자리인지 고르기">
            {TPO_CHOICES.map((tpo) => (
              <m.button key={tpo} type="button" className="choice" whileTap={TAP} disabled={replanning} onClick={() => replanDay({ tpo })}>
                {TPO_LABEL[tpo]}
              </m.button>
            ))}
          </div>
        </m.div>
      )}

      {loading && (
        <>
          <ModiNote pose="think">옷장과 날씨, 일정을 보고 오늘 코디를 고르는 중이에요.</ModiNote>
          <BoardSkeleton />
          <VerdictSkeleton />
        </>
      )}

      {!loading && (clothes.isError || plan.isError) && (
        <ModiState
          pose="sorry"
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
          pose="empty"
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
          <ModiNote pose={done ? 'cheer' : custom ? 'hello' : poseFor(current)}>{done ? '오늘 코디를 기록했어요. 체감은 다음 추천 두께에 반영돼요.' : custom ? '바꾼 조합으로 다시 살펴봤어요.' : todayLine(current, event)}</ModiNote>

          <OutfitBoard pieces={pieces} onSlot={setPicking} busy={evaluation.isFetching} />

          {custom && !done && (
            <div className="board-actions">
              {anchor && (
                <m.button type="button" className="button button--small" whileTap={TAP} disabled={replanning} onClick={() => replanDay({ anchorItemId: anchor.id })}>
                  {replanning && <Spinner />}
                  {itemLabel(anchor)}에 맞춰 다시 고르기
                </m.button>
              )}
              {planned.length > 0 && (
                <button type="button" className="text-button" onClick={() => (setAnchorId(null), follow(planned))}>
                  모디 추천으로 되돌리기
                </button>
              )}
            </div>
          )}

          {!hasBase && <p className="note">{day?.outfit ? '상의와 하의를 넣으면 점수를 볼 수 있어요.' : (day?.reason ?? '상의와 하의를 넣으면 점수를 볼 수 있어요.')}</p>}

          {hasBase && evaluation.isError && <p className="note note--bad">{(evaluation.error as Error).message}</p>}

          {hasBase && !result && evaluation.isPending && <VerdictSkeleton />}

          {hasBase && result && (
            <m.section className="verdict" aria-label="코디 평가" aria-busy={evaluation.isFetching} variants={fadeUp} initial="hidden" animate="show">
              <div className="verdict__head">
                <p className="verdict__score">
                  <strong>
                    <CountUp value={result.score} />
                  </strong>
                  점
                </p>
                <p className="verdict__grade">{GRADE_LABEL[result.grade]}</p>
                <p className="verdict__source">{result.aiAvailable ? 'AI 평가' : '규칙 평가'}</p>
              </div>
              <p className="verdict__summary">{custom || !day?.reason ? result.summary : day.reason}</p>

              <h2 className="section-title">고른 이유</h2>
              <m.dl className="reasons" variants={list} initial="hidden" animate="show">
                {CHECKS.map(([key, label]) => {
                  const check = result.checks[key];
                  return (
                    <m.div key={key} className={`reason${check.ok ? '' : ' is-off'}`} variants={listItem}>
                      <dt>{label}</dt>
                      <dd>{check.message}</dd>
                      <dd className="reason__score" aria-label={`${check.score}점`}>
                        {check.score}
                      </dd>
                    </m.div>
                  );
                })}
                {!custom && day?.layeringTip && (
                  <m.div className="reason" variants={listItem}>
                    <dt>시간대</dt>
                    <dd>{day.layeringTip}</dd>
                  </m.div>
                )}
              </m.dl>

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
                        <m.li key={`${s.replaceItemId}-${s.withItemId}-${index}`} className="swap" variants={fadeUp} initial="hidden" animate="show">
                          <div className="swap__text">
                            {to && (
                              <p className="swap__title">
                                {from ? `${itemLabel(from)} 대신 ${itemLabel(to)}` : `${itemLabel(to)} 더해 입기`}
                              </p>
                            )}
                            <p className="swap__reason">{s.reason}</p>
                          </div>
                          {to && (
                            <m.button type="button" className="button button--small" whileTap={TAP} onClick={() => put(to)}>
                              {from ? '바꿔 입기' : '더해 입기'}
                            </m.button>
                          )}
                        </m.li>
                      );
                    })}
                  </ul>
                </>
              )}
            </m.section>
          )}

          <m.div className="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.3 }}>
            {done ? (
              <p className="actions__done">
                오늘 입은 옷으로 기록했어요.
                <button type="button" className="text-button" onClick={() => setRecording(true)}>
                  다시 기록
                </button>
              </p>
            ) : (
              <m.button type="button" className="button button--primary button--block" whileTap={TAP} disabled={!hasBase} onClick={() => setRecording(true)}>
                오늘 이 옷 입기
              </m.button>
            )}
          </m.div>
        </>
      )}

      <AnimatePresence>
        {picking && (
          <PickSheet
            key="pick"
            slot={picking}
            closet={closet}
            currentId={worn[picking]}
            onPick={pick}
            onRemove={() => (remove(picking), setPicking(null))}
            onClose={() => setPicking(null)}
          />
        )}
        {recording && <WearSheet key="wear" items={wornItems} onClose={() => setRecording(false)} />}
      </AnimatePresence>
    </div>
  );
}
