// 기능: 주간 계획. 일정, 예보, 세탁 상태로 짠 7일 코디와 세탁 할 일

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DayPlan } from '../api/types';
import { AddEventSheet } from '../components/AddEventSheet';
import { ItemFigure } from '../components/ItemFigure';
import { useToast } from '../components/Toast';
import { AlertIcon, DropIcon, PlusIcon } from '../components/icons';
import { useClothes, useDeleteEvent, useStartLaundry, useWeekPlan } from '../hooks/queries';
import { dayOfMonth, formatDeadline, formatTime, today, weekdayOf } from '../lib/date';
import { CONDITION_LABEL, TPO_LABEL, itemLabel } from '../lib/labels';
import { useOutfit } from '../store/outfit';

function DayCard({ day, isToday, onTry, onRemoveEvent }: { day: DayPlan; isToday: boolean; onTry: () => void; onRemoveEvent: (id: string, title: string) => void }) {
  return (
    <li className={`day${isToday ? ' is-today' : ''}`}>
      <div className="day__date">
        <span className="day__num">{dayOfMonth(day.date)}</span>
        <span className="day__weekday">{isToday ? '오늘' : `${weekdayOf(day.date)}요일`}</span>
      </div>
      <div className="day__body">
        <p className="day__weather">
          {day.weather
            ? `${CONDITION_LABEL[day.weather.condition]}, ${Math.round(day.weather.temperatureMin)}° / ${Math.round(day.weather.temperatureMax)}°, 비 올 확률 ${day.weather.precipitationProbabilityMax}%`
            : '예보 없음'}
        </p>

        {day.events.length > 0 ? (
          <ul className="day__events">
            {day.events.map((e) => (
              <li key={e.id}>
                <span className="day__time">{formatTime(e.startsAt)}</span>
                <span className="day__title">{e.title}</span>
                <span className="tag">{TPO_LABEL[e.tpo]}</span>
                <button type="button" className="link-button" onClick={() => onRemoveEvent(e.id, e.title)}>
                  삭제
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="day__empty">일정 없음, {TPO_LABEL[day.tpo]} 차림</p>
        )}

        {day.outfit ? (
          <>
            <ul className="outfit-row">
              {day.outfit.items.map(({ slot, item }) => (
                <li key={slot}>
                  <span className="outfit-row__figure">
                    <ItemFigure item={item} />
                  </span>
                  <span className="outfit-row__name">{itemLabel(item)}</span>
                </li>
              ))}
            </ul>
            <p className="day__reason">{day.reason}</p>
            {day.layeringTip && <p className="day__tip">{day.layeringTip}</p>}
          </>
        ) : (
          <p className="day__reason">{day.reason}</p>
        )}

        {day.warnings.map((w) => (
          <p key={w} className="day__warning">
            <AlertIcon width={16} height={16} /> {w}
          </p>
        ))}

        {day.outfit && (
          <button type="button" className="button button--small" onClick={onTry}>
            옷방에서 입혀보기
          </button>
        )}
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
  const setOutfit = useOutfit((s) => s.setOutfit);
  const toast = useToast((s) => s.show);
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  // 지금 세탁기에 넣어도 되는 옷인지 (이미 세탁할 때가 된 옷만)
  const washableNow = (itemIds: string[]) =>
    itemIds.every((id) => {
      const item = clothes.data?.find((c) => c.id === id);
      return Boolean(item && (item.needsWash || item.status === 'LAUNDRY'));
    });

  return (
    <div className="page page--week">
      <header className="page-head">
        <div>
          <h1 className="page-title">이번 주 계획</h1>
          <p className="page-lead">일정과 예보, 세탁 상태를 함께 보고 하루 한 벌씩 골랐어요.</p>
        </div>
        <button type="button" className="button button--small" onClick={() => setAdding(true)}>
          <PlusIcon width={18} height={18} /> 일정 추가
        </button>
      </header>

      {plan.isPending && <p className="note page__note">계획을 짜는 중이에요.</p>}
      {plan.isError && <p className="note note--bad page__note">{(plan.error as Error).message}</p>}

      {plan.data && (
        <>
          {(plan.data.laundryTasks.length > 0 || plan.data.conflicts.length > 0) && (
            <section className="laundry" aria-label="세탁 할 일">
              <h2 className="section-title">
                <DropIcon width={20} height={20} /> 세탁 할 일
              </h2>
              <ul>
                {plan.data.laundryTasks.map((task) => (
                  <li key={`${task.forDate}-${task.itemIds.join()}`} className="laundry__task">
                    <div>
                      <p className="laundry__deadline">{formatDeadline(task.deadline)}까지 시작</p>
                      <p className="laundry__items">{task.itemNames.join(', ')}</p>
                      <p className="laundry__reason">{task.reason}</p>
                    </div>
                    {washableNow(task.itemIds) ? (
                      <button
                        type="button"
                        className="button button--small"
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
                {plan.data.conflicts.map((c) => (
                  <li key={c} className="laundry__conflict">
                    <AlertIcon width={18} height={18} /> {c}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ol className="days">
            {plan.data.days.map((day) => (
              <DayCard
                key={day.date}
                day={day}
                isToday={day.date === start}
                onTry={() => {
                  if (day.outfit) setOutfit(day.outfit.items.map((e) => e.item));
                  navigate('/');
                }}
                onRemoveEvent={(id, title) => {
                  if (window.confirm(`${title} 일정을 삭제할까요?`)) {
                    removeEvent.mutateAsync(id).catch((e: Error) => toast(e.message));
                  }
                }}
              />
            ))}
          </ol>
          {!plan.data.aiAvailable && <p className="note page__note">AI 연결 없이 규칙으로 짠 계획이에요. 설명도 규칙 문장이에요.</p>}
        </>
      )}

      {adding && <AddEventSheet start={start} onClose={() => setAdding(false)} />}
    </div>
  );
}
