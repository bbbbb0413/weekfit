// 기능: 캘린더 내보내기 파일(.ics)에서 일정 읽기. 반복 일정(RRULE)은 첫 회만 읽음

import type { EventInput } from '../api/types';

// 20261123T100000 또는 20261123 → 한국 시간 ISO 문자열
function toIso(value: string, isDateOnly: boolean, hour: string): string | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, utc] = m;
  if (isDateOnly || !h) return `${y}-${mo}-${d}T${hour}:00:00+09:00`;
  if (utc) return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)).toISOString();
  // 시간대 표기가 없거나 TZID 가 붙은 값은 한국 시간으로 해석
  return `${y}-${mo}-${d}T${h}:${mi}:${s}+09:00`;
}

function unescape(text: string): string {
  return text.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
}

export function parseIcs(text: string): EventInput[] {
  // 다음 줄이 공백으로 시작하면 앞줄에 이어 붙임
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const events: EventInput[] = [];
  let current: Record<string, { params: string; value: string }> | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      const start = current?.DTSTART;
      const title = current?.SUMMARY ? unescape(current.SUMMARY.value) : '';
      if (current && start && title) {
        const allDay = start.params.includes('VALUE=DATE') || !start.value.includes('T');
        const startsAt = toIso(start.value, allDay, '09');
        const end = current.DTEND;
        const endsAt = (end && !allDay && toIso(end.value, false, '18')) || (startsAt ? toIso(start.value.slice(0, 8), true, '18') : null);
        if (startsAt && endsAt) {
          events.push({
            externalId: current.UID?.value ?? null,
            title: title.slice(0, 200),
            startsAt,
            endsAt: allDay ? toIso(start.value.slice(0, 8), true, '18')! : endsAt,
            location: current.LOCATION ? unescape(current.LOCATION.value).slice(0, 200) || null : null,
          });
        }
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const [name, ...params] = line.slice(0, colon).split(';');
    current[name.toUpperCase()] = { params: params.join(';'), value: line.slice(colon + 1) };
  }
  return events;
}
