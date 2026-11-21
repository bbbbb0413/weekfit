// 기능: 주간 화면. 세탁 할 일을 먼저, 이어서 7일 코디와 일정

import { useState } from 'react';
import type { DayPlan } from '../api/types';
import { AddEventSheet } from '../components/AddEventSheet';
import { ModiState } from '../components/ModiNote';
import { OutfitStrip, piecesOf } from '../components/OutfitBoard';
import { useToast } from '../components/Toast';
import { AlertIcon, PlusIcon } from '../components/icons';
import { useClothes, useDeleteEvent, useStartLaundry, useWeekPlan } from '../hooks/queries';
import { dayOfMonth, formatDeadline, formatTime, today, weekdayOf } from '../lib/date';
import { CONDITION_LABEL, TPO_LABEL } from '../lib/labels';

function DayRow({ day, isToday, onRemoveEvent }: { day: DayPlan; isToday: boolean; onRemoveEvent: (id: string, title: string) => void }) {
  return (
    <li className={`day${isToday ? ' is-today' : ''}`}>
      <div className="day__date">
        <span className="day__weekday">{isToday ? '오늘' : weekdayOf(day.date)}</span>
        <span className="day__num">{dayOfMonth(day.date)}</span>
      </div>
      <div className="day__body">
        <p className="day__weather">
          {day.weather
            ? `${CONDITION_LABEL[day.weather.condition]}, ${Math.round(day.weather.temperatureMin)}°에서 ${Math.round(day.weather.temperatureMax)}°, 비 올 확률 ${day.weather.precipitationProbabilityMax}%`
            : '예보 없음'}
        </p>

        {day.events.length > 0 ? (
          <ul className="day__events">
            {day.events.map((e) => (
              <li key={e.id}>
                <span className="day__time">{formatTime(e.startsAt)}</span>
                <span className="day__title">{e.title}</span>
                <span className="day__tpo">{TPO_LABEL[e.tpo]}</span>
                <button type="button" className="text-button day__remove" onClick={() => onRemoveEvent(e.id, e.title)}>
                  삭제
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="day__empty">일정 없음, {TPO_LABEL[day.tpo]} 차림</p>
        )}

        {day.outfit && <OutfitStrip pieces={piecesOf(day.outfit)} />}
        <p className="day__reason">{day.reason}</p>
        {day.layeringTip && <p className="day__tip">{day.layeringTip}</p>}

        {day.warnings.map((w) => (
          <p key={w} className="caution">
            <AlertIcon width={16} height={16} /> {w}
          </p>
        ))}
      </div>
    </li>
  );
}

export function WeekPage() {
  const start = today();
  const plan = useWeekPlan(start);
  const clothes = useClothes();
  const laundry = useStartLaundry();
  const removeEvent = useDeleteEvent();
  const toast = useToast((s) => s.show);
  const [adding, setAdding] = useState(false);

  // 지금 세탁기에 넣어도 되는 옷인지 (이미 세탁할 때가 된 옷만)
  const washableNow = (itemIds: string[]) =>
    itemIds.every((id) => {
      const item = clothes.data?.find((c) => c.id === id);
      return Boolean(item && (item.needsWash || item.status === 'LAUNDRY'));
    });

  const data = plan.data;
  const tasks = data ? [...data.laundryTasks].sort((a, b) => a.deadline.localeCompare(b.deadline)) : [];

  return (
    <div className="page page--week">
      <header className="page-head">
        <div>
          <h1 className="page-title">이번 주</h1>
          <p className="page-lead">일정, 예보, 세탁 상태를 함께 보고 하루 한 벌씩 골랐어요.</p>
        </div>
        <button type="button" className="button button--small" onClick={() => setAdding(true)}>
          <PlusIcon width={18} height={18} /> 일정 추가
        </button>
      </header>

      {plan.isPending && <ModiState title="일주일 코디를 짜는 중이에요">일정이 중요한 날부터 옷을 배정하고, 세탁이 필요한 옷은 마르는 시간까지 거꾸로 계산해요.</ModiState>}
      {plan.isError && (
        <ModiState
          pose="sorry"
          title="주간 계획을 불러오지 못했어요"
          action={
            <button type="button" className="button" onClick={() => plan.refetch()}>
              다시 불러오기
            </button>
          }
        >
          {(plan.error as Error).message}
        </ModiState>
      )}

      {data && (
        <>
          <section className="laundry" aria-label="세탁 할 일">
            <h2 className="section-title">세탁 할 일</h2>
            {tasks.length === 0 && data.conflicts.length === 0 ? (
              <p className="laundry__none">이번 주 코디에 필요한 옷은 모두 입을 수 있는 상태예요.</p>
            ) : (
              <ul className="laundry__list">
                {tasks.map((task) => (
                  <li key={`${task.forDate}-${task.itemIds.join()}`} className="laundry__task">
                    <div className="laundry__text">
                      <p className="laundry__deadline">{formatDeadline(task.deadline)}까지 시작</p>
                      <p className="laundry__items">{task.itemNames.join(', ')}</p>
                      <p className="laundry__reason">{task.reason}</p>
                    </div>
                    {washableNow(task.itemIds) ? (
                      <button
                        type="button"
                        className="button button--primary button--small"
                        disabled={laundry.isPending}
                        onClick={() =>
                          laundry
                            .mutateAsync(task.itemIds)
                            .then(() => toast(`${task.itemNames.join(', ')} 세탁을 시작했어요.`))
                            .catch((e: Error) => toast(e.message))
                        }
                      >
                        세탁 시작
                      </button>
                    ) : (
                      <span className="laundry__later">입은 뒤 세탁</span>
                    )}
                  </li>
                ))}
                {data.conflicts.map((c) => (
                  <li key={c} className="caution">
                    <AlertIcon width={16} height={16} /> {c}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ol className="days">
            {data.days.map((day) => (
              <DayRow
                key={day.date}
                day={day}
                isToday={day.date === start}
                onRemoveEvent={(id, title) => {
                  if (window.confirm(`${title} 일정을 삭제할까요?`)) {
                    removeEvent.mutateAsync(id).catch((e: Error) => toast(e.message));
                  }
                }}
              />
            ))}
          </ol>
          <p className="source-line">{data.aiAvailable ? 'AI와 규칙으로 짠 계획이에요.' : 'AI 연결 없이 규칙으로 짠 계획이에요. 설명도 규칙 문장이에요.'}</p>
        </>
      )}

      {adding && <AddEventSheet start={start} onClose={() => setAdding(false)} />}
    </div>
  );
}
