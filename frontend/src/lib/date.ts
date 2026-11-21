// 기능: 날짜 계산 & 표시 (Asia/Seoul 기준 문자열 처리)

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function today(): string {
  return toDateString(new Date());
}

export function parseDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

export function weekdayOf(value: string): string {
  return WEEKDAYS[parseDate(value).getDay()];
}

export function dayOfMonth(value: string): number {
  return parseDate(value).getDate();
}

export function formatMonthDay(value: string): string {
  const date = parseDate(value);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}요일`;
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatDeadline(iso: string): string {
  const date = new Date(iso);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}요일 ${formatTime(iso)}`;
}

export function toLocalIso(dateString: string, time: string): string {
  // 입력값을 한국 시간으로 해석
  return `${dateString}T${time}:00+09:00`;
}

export function dateOfIso(iso: string): string {
  return toDateString(new Date(iso));
}
