// 기능: 브라우저 규칙 계산 (일정 분석, 옷 평가, 주간 계획). 백엔드 없이 동작할 때 & 아직 없는 엔드포인트 대신 사용

import type {
  CalendarEvent,
  Clothing,
  Color,
  DailyWeather,
  DayPlan,
  EvaluationCheck,
  EvaluationSuggestion,
  EventAnalysis,
  LaundryTask,
  MaskPreview,
  Outfit,
  OutfitEntry,
  OutfitEvaluation,
  OutfitSlot,
  Tpo,
  WeekPlan,
} from '../types';
import { addDays, dateOfIso, weekdayOf } from '../../lib/date';
import { TPO_LABEL, WARMTH_LABEL, itemLabel } from '../../lib/labels';
import { josa } from '../../lib/josa';

const LAYERING_RANGE = 8;
const RAIN_ALERT = 50;

const TPO_NAME: Record<Tpo, string> = { DAILY: '일상', WORK: '출근', FORMAL: '격식 있는 자리', DATE: '데이트', OUTDOOR: '야외활동', EXERCISE: '운동' };

const TPO_FORMALITY: Record<Tpo, number> = {
  DAILY: 2,
  WORK: 3,
  FORMAL: 4,
  DATE: 3,
  OUTDOOR: 2,
  EXERCISE: 1,
};

const NEUTRALS: Color[] = ['블랙', '화이트', '그레이', '네이비', '베이지', '브라운', '카키'];

function clamp(value: number, min = 1, max = 5): number {
  return Math.max(min, Math.min(max, value));
}

// 백엔드 WarmthRules 와 같은 구간
export function requiredWarmthAt(apparent: number, bias: number): number {
  let base = 5;
  if (apparent >= 27) base = 1;
  else if (apparent >= 22) base = 2;
  else if (apparent >= 16) base = 3;
  else if (apparent >= 9) base = 4;
  return clamp(base + bias);
}

export function requiredWarmth(day: DailyWeather, bias: number): number {
  return requiredWarmthAt(day.apparentMax * 0.6 + day.apparentMin * 0.4, bias);
}

export function outfitWarmth(items: Clothing[]): number {
  const base = Math.max(1, ...items.filter((i) => i.category === 'TOP' || i.category === 'DRESS').map((i) => i.warmth));
  const outer = items.find((i) => i.category === 'OUTER');
  return outer ? clamp(base + Math.floor((outer.warmth + 1) / 2)) : clamp(base);
}

// ---------- 일정 ----------

export function maskText(title: string, location?: string | null): MaskPreview {
  let count = 0;
  const mask = (text: string) =>
    text
      .replace(/01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g, () => (count++, '[전화번호]'))
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, () => (count++, '[이메일]'))
      .replace(/https?:\/\/\S+/g, () => (count++, '[링크]'))
      .replace(/[가-힣]{2,4}(님|씨)(?=\s|$|[과와랑])/g, (_m, suffix: string) => (count++, `[이름]${suffix}`))
      .replace(/[가-힣]{2,3}(이랑|랑)(?=\s)/g, (_m, suffix: string) => (count++, `[이름]${suffix}`));
  const maskedTitle = mask(title);
  const maskedLocation = location ? mask(location) : null;
  return { title: maskedTitle, location: maskedLocation, maskedCount: count };
}

interface Rule {
  pattern: RegExp;
  analysis: Partial<EventAnalysis> & { tpo: Tpo };
}

const EVENT_RULES: Rule[] = [
  {
    pattern: /결혼식|웨딩|하객/,
    analysis: { tpo: 'FORMAL', formality: 4, dressCode: '하객 세미정장', avoidColors: ['화이트'], indoor: true, importance: 5 },
  },
  {
    pattern: /면접|인터뷰/,
    analysis: { tpo: 'FORMAL', formality: 5, dressCode: '면접 정장', indoor: true, importance: 5 },
  },
  {
    pattern: /장례|조문|빈소/,
    analysis: {
      tpo: 'FORMAL',
      formality: 4,
      dressCode: '조문 복장',
      avoidColors: ['레드', '핑크', '옐로', '오렌지'],
      indoor: true,
      importance: 5,
    },
  },
  {
    pattern: /등산|산행|트레킹|캠핑|하이킹/,
    analysis: { tpo: 'OUTDOOR', formality: 1, indoor: false, activityLevel: 'HIGH', importance: 3 },
  },
  {
    pattern: /헬스|러닝|요가|필라테스|운동|풋살|수영/,
    analysis: { tpo: 'EXERCISE', formality: 1, activityLevel: 'HIGH', importance: 2 },
  },
  { pattern: /데이트|소개팅|기념일/, analysis: { tpo: 'DATE', formality: 3, importance: 4 } },
  { pattern: /발표|PT|피티/, analysis: { tpo: 'WORK', formality: 4, dressCode: '발표용 단정한 차림', indoor: true, importance: 4 } },
  { pattern: /회의|미팅|출근|워크숍|교육|회사/, analysis: { tpo: 'WORK', formality: 3, indoor: true, importance: 3 } },
];

export function analyzeEvent(title: string): EventAnalysis {
  const rule = EVENT_RULES.find((r) => r.pattern.test(title));
  const base: EventAnalysis = {
    tpo: 'DAILY',
    formality: 2,
    dressCode: null,
    avoidColors: [],
    indoor: null,
    activityLevel: 'LOW',
    importance: 2,
    confidence: 0.4,
    source: 'RULE',
    clarifyQuestion: null,
  };
  if (!rule) {
    return { ...base, clarifyQuestion: '어떤 자리인지 알려주면 더 정확하게 고를 수 있어요.' };
  }
  return { ...base, ...rule.analysis, confidence: 0.8 };
}

// ---------- 옷 평가 ----------

export interface EvaluationContext {
  items: Clothing[];
  closet: Clothing[];
  day: DailyWeather | null;
  tpo: Tpo;
  formality: number;
  avoidColors: Color[];
  dressCode: string | null;
  eventTitle: string | null;
  warmthBias: number;
}

function gradeOf(score: number): OutfitEvaluation['grade'] {
  if (score >= 85) return 'GREAT';
  if (score >= 70) return 'GOOD';
  if (score >= 50) return 'FAIR';
  return 'POOR';
}

function weatherCheck(ctx: EvaluationContext): EvaluationCheck & { diff: number; required: number } {
  if (!ctx.day) {
    return { score: 60, ok: true, message: '예보를 불러오지 못해 날씨는 평가에서 뺐어요.', diff: 0, required: 3 };
  }
  const required = requiredWarmth(ctx.day, ctx.warmthBias);
  const warmth = outfitWarmth(ctx.items);
  const diff = warmth - required;
  const range = `체감 ${Math.round(ctx.day.apparentMin)}~${Math.round(ctx.day.apparentMax)}℃`;
  const score = [100, 70, 40, 15][Math.min(3, Math.abs(diff))];
  const slight = Math.abs(diff) === 1 ? '조금 ' : '';
  let message =
    diff === 0
      ? `${range}에 잘 맞는 두께예요.`
      : diff < 0
        ? `${range}에는 ${slight}얇아요. '${WARMTH_LABEL[required]}' 두께가 필요한데 지금 조합은 '${WARMTH_LABEL[warmth]}'이에요.`
        : `${range}에는 ${slight}두꺼워요. '${WARMTH_LABEL[required]}' 두께면 충분한데 지금 조합은 '${WARMTH_LABEL[warmth]}'이에요.`;
  if (ctx.day.precipitationProbabilityMax >= RAIN_ALERT) {
    message += ` 비나 눈 올 확률이 ${ctx.day.precipitationProbabilityMax}%라 우산을 챙기세요.`;
  }
  return { score, ok: diff === 0, message, diff, required };
}

function tpoCheck(ctx: EvaluationContext): EvaluationCheck & { weakest: Clothing | null; offending: Clothing | null } {
  const body = ctx.items.filter((i) => i.category !== 'ACCESSORY');
  const weakest = body.reduce<Clothing | null>((min, i) => (!min || i.formality < min.formality ? i : min), null);
  const average = body.reduce((sum, i) => sum + i.formality, 0) / Math.max(1, body.length);
  const gap = weakest ? ctx.formality - weakest.formality : 0;
  const label = ctx.dressCode ?? TPO_LABEL[ctx.tpo];
  const occasion = ctx.eventTitle ? `${ctx.eventTitle} 일정` : `${TPO_LABEL[ctx.tpo]} 차림`;

  let score = gap <= 0 ? 100 : [100, 75, 45, 20][Math.min(3, gap)];
  let message = `${occasion}에 맞는 격식이에요.`;
  if (gap > 0 && weakest) {
    message = `${occasion}에는 ${josa(itemLabel(weakest), '이가')} 가벼워 보여요. ${label} 기준으로 한 단계 올려보세요.`;
  } else if (average - ctx.formality >= 2) {
    score = 70;
    message = `${occasion}에는 격식이 과한 편이에요.`;
  }

  const offending =
    ctx.items.find((i) => i.category !== 'SHOES' && i.category !== 'ACCESSORY' && ctx.avoidColors.includes(i.colors[0])) ?? null;
  if (offending) {
    score = Math.min(score, 30);
    message = `${occasion}에서는 ${offending.colors[0]} 계열을 피하는 게 좋아요. ${josa(itemLabel(offending), '이가')} 걸려요.`;
  }
  return { score, ok: score >= 70, message, weakest: gap > 0 ? weakest : null, offending };
}

function colorCheck(items: Clothing[]): EvaluationCheck {
  const mains = items.filter((i) => i.category !== 'SHOES' && i.category !== 'ACCESSORY').map((i) => i.colors[0]);
  const chromatic = new Set(mains.filter((c) => !NEUTRALS.includes(c)));
  const top = items.find((i) => i.category === 'TOP');
  const bottom = items.find((i) => i.category === 'BOTTOM');
  if (chromatic.size >= 3) return { score: 40, ok: false, message: '강한 색이 세 가지 이상이라 산만해 보일 수 있어요.' };
  if (chromatic.size === 2) return { score: 65, ok: false, message: '강한 색 두 가지가 겹쳐요. 하나를 기본색으로 바꿔보세요.' };
  if (top && bottom && top.colors[0] === bottom.colors[0]) {
    return { score: 80, ok: true, message: `위아래가 같은 ${top.colors[0]} 계열이라 단조로울 수 있어요. 겉옷이나 신발로 변화를 주면 좋아요.` };
  }
  if (chromatic.size === 1) return { score: 95, ok: true, message: '기본색에 포인트 색 하나라 균형이 좋아요.' };
  return { score: 90, ok: true, message: '기본색끼리의 조합이라 무난해요.' };
}

function laundryCheck(items: Clothing[]): EvaluationCheck & { blocked: Clothing | null } {
  const blocked = items.find((i) => i.status !== 'AVAILABLE') ?? null;
  if (blocked) {
    const state = blocked.status === 'LAUNDRY' ? '세탁 대기 중' : blocked.status === 'DRYING' ? '건조 중' : '수선 중';
    return { score: 20, ok: false, message: `${josa(itemLabel(blocked), '은는')} ${state}이라 지금 입을 수 없어요.`, blocked };
  }
  const due = items.find((i) => i.needsWash);
  if (due) return { score: 60, ok: false, message: `${josa(itemLabel(due), '은는')} ${due.wearsSinceWash}번 입어서 세탁할 때가 됐어요.`, blocked: null };
  return { score: 100, ok: true, message: '모두 바로 입을 수 있는 상태예요.', blocked: null };
}

function closest(candidates: Clothing[], like: Clothing, prefer: (c: Clothing) => number): Clothing | null {
  const pool = candidates.filter((c) => c.category === like.category && c.id !== like.id && c.status === 'AVAILABLE' && !c.needsWash);
  if (pool.length === 0) return null;
  return pool.reduce((best, c) => (prefer(c) < prefer(best) ? c : best));
}

export function evaluateOutfit(ctx: EvaluationContext): OutfitEvaluation {
  const weather = weatherCheck(ctx);
  const tpo = tpoCheck(ctx);
  const color = colorCheck(ctx.items);
  const laundry = laundryCheck(ctx.items);
  const score = Math.round(weather.score * 0.35 + tpo.score * 0.3 + color.score * 0.15 + laundry.score * 0.2);

  const suggestions: EvaluationSuggestion[] = [];
  const push = (from: Clothing | null, to: Clothing | null, reason: string) => {
    if (!from || !to || suggestions.some((s) => s.replaceItemId === from.id)) return;
    suggestions.push({ replaceItemId: from.id, withItemId: to.id, reason });
  };

  if (tpo.offending) {
    const offending = tpo.offending;
    push(
      offending,
      closest(
        ctx.closet.filter((c) => !ctx.avoidColors.includes(c.colors[0])),
        offending,
        (c) => Math.abs(c.formality - ctx.formality) + Math.abs(c.warmth - offending.warmth) * 0.5,
      ),
      `${offending.colors[0]} 계열을 피할 수 있어요.`,
    );
  }
  if (tpo.weakest) {
    const weakest = tpo.weakest;
    push(
      weakest,
      closest(
        ctx.closet.filter((c) => c.formality >= ctx.formality && !ctx.avoidColors.includes(c.colors[0])),
        weakest,
        (c) => Math.abs(c.formality - ctx.formality) + Math.abs(c.warmth - weakest.warmth) * 0.5,
      ),
      '일정에 맞는 격식으로 올릴 수 있어요.',
    );
  }
  if (laundry.blocked) {
    const blocked = laundry.blocked;
    push(
      blocked,
      closest(ctx.closet, blocked, (c) => Math.abs(c.formality - blocked.formality) + Math.abs(c.warmth - blocked.warmth)),
      '바로 입을 수 있는 비슷한 옷이에요.',
    );
  }
  if (weather.diff !== 0) {
    const outer = ctx.items.find((i) => i.category === 'OUTER');
    const base = ctx.items.find((i) => i.category === 'TOP' || i.category === 'DRESS');
    const target = outer ?? base;
    if (target) {
      const others = ctx.items.filter((i) => i.id !== target.id);
      push(
        target,
        closest(ctx.closet, target, (c) => Math.abs(outfitWarmth([...others, c]) - weather.required) * 3 + Math.abs(c.formality - target.formality)),
        weather.diff < 0 ? '더 따뜻하게 맞출 수 있어요.' : '더 가볍게 맞출 수 있어요.',
      );
    }
  }

  const failing = [
    { check: weather, name: '날씨' },
    { check: tpo, name: '일정' },
    { check: laundry, name: '세탁 상태' },
    { check: color, name: '색 조합' },
  ].filter((c) => !c.check.ok);
  const needsOuter = weather.diff < 0 && !ctx.items.some((i) => i.category === 'OUTER');
  let summary =
    failing.length === 0
      ? '날씨와 일정 모두에 맞는 조합이에요.'
      : `${failing.map((f) => f.name).join(', ')} 쪽을 손보면 더 좋아져요.`;
  if (needsOuter) summary += ' 겉옷을 하나 더하면 두께가 맞아요.';

  return {
    score,
    grade: gradeOf(score),
    checks: {
      weather: { score: weather.score, ok: weather.ok, message: weather.message },
      tpo: { score: tpo.score, ok: tpo.ok, message: tpo.message },
      color,
      laundry: { score: laundry.score, ok: laundry.ok, message: laundry.message },
    },
    summary,
    suggestions: suggestions.slice(0, 3),
    warnings: [],
    aiAvailable: false,
  };
}

// ---------- 주간 계획 ----------

export interface PlanContext {
  start: string;
  closet: Clothing[];
  events: CalendarEvent[];
  daily: DailyWeather[];
  warmthBias: number;
  now: Date;
}

const DRY_HOURS: Partial<Record<Clothing['category'], number>> = { OUTER: 48 };

function slotEntries(items: Clothing[]): OutfitEntry[] {
  const order: OutfitSlot[] = ['OUTER', 'TOP', 'DRESS', 'BOTTOM', 'SHOES'];
  return order
    .map((slot) => ({ slot, item: items.find((i) => i.category === slot) }))
    .filter((e): e is OutfitEntry => Boolean(e.item));
}

export function planWeek(ctx: PlanContext): WeekPlan {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(ctx.start, i));
  const usage = new Map<string, number>();
  const laundryTasks: LaundryTask[] = [];
  const conflicts: string[] = [];

  const drafts = dates.map((date) => {
    const events = ctx.events
      .filter((e) => dateOfIso(e.startsAt) === date)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const main = events.reduce<CalendarEvent | null>(
      (top, e) => (!top || e.analysis.importance > top.analysis.importance ? e : top),
      null,
    );
    const weekday = weekdayOf(date);
    const tpo: Tpo = main?.analysis.tpo ?? (weekday === '토' || weekday === '일' ? 'DAILY' : 'WORK');
    const weather = ctx.daily.find((d) => d.date === date) ?? null;
    return { date, events, main, tpo, weather, importance: main?.analysis.importance ?? 1 };
  });

  const plans = new Map<string, DayPlan>();

  // 중요한 일정이 있는 날부터 옷 배정
  [...drafts]
    .sort((a, b) => b.importance - a.importance || a.date.localeCompare(b.date))
    .forEach((draft) => {
      const formality = draft.main?.analysis.formality ?? TPO_FORMALITY[draft.tpo];
      const avoid = draft.main?.analysis.avoidColors ?? [];
      const required = draft.weather ? requiredWarmth(draft.weather, ctx.warmthBias) : 3;
      const important = draft.importance >= 4;
      const dayStart = new Date(`${draft.date}T07:00:00+09:00`);
      const warnings: string[] = [];

      const readyBy = (item: Clothing): 'ready' | 'wash' | 'never' => {
        if (item.status === 'REPAIR') return 'never';
        if (item.status === 'DRYING') return item.dryUntil && new Date(item.dryUntil) <= dayStart ? 'ready' : 'never';
        if (item.status === 'LAUNDRY' || item.needsWash) return 'wash';
        return 'ready';
      };

      const pick = (category: Clothing['category'], score: (c: Clothing) => number): Clothing | null => {
        const ranked = ctx.closet
          .filter((c) => c.category === category && !avoid.includes(c.colors[0]) && readyBy(c) !== 'never')
          .map((c) => ({ c, s: score(c) + (usage.get(c.id) ?? 0) * 1.5 + (readyBy(c) === 'wash' ? (important ? 0.4 : 6) : 0) }))
          .sort((a, b) => a.s - b.s);
        for (const { c } of ranked) {
          if (readyBy(c) === 'ready') return c;
          const deadline = new Date(dayStart.getTime() - (DRY_HOURS[c.category] ?? 24) * 3600_000);
          if (deadline > ctx.now) return c;
          if (important) {
            conflicts.push(`${josa(itemLabel(c), '은는')} ${weekdayOf(draft.date)}요일까지 마르지 않아 다른 옷으로 바꿨어요.`);
          }
        }
        return null;
      };

      const outdoor = draft.tpo === 'OUTDOOR' || draft.tpo === 'EXERCISE';
      const top = pick('TOP', (c) => Math.abs(c.formality - formality) * 2 + Math.abs(c.warmth - Math.min(required, 4)) * 0.8);
      const bottom = pick('BOTTOM', (c) => Math.abs(c.formality - formality) * 2 + Math.abs(c.warmth - 3) * 0.3);
      const needOuter = top ? required - top.warmth >= 1 : required >= 3;
      const sporty = (c: Clothing) => c.styles.includes('아웃도어') || c.styles.includes('스포티');
      const outer = needOuter
        ? pick(
            'OUTER',
            (c) =>
              Math.abs(outfitWarmth(top ? [top, c] : [c]) - required) * 3 +
              Math.abs(c.formality - formality) +
              (!outdoor && sporty(c) ? 3 : 0),
          )
        : null;
      const shoes = pick('SHOES', (c) => {
        const trail = c.styles.includes('아웃도어');
        if (draft.tpo === 'OUTDOOR') return trail ? -3 : Math.abs(c.formality - formality) * 2;
        return Math.abs(c.formality - formality) * 2 + (trail ? 4 : 0);
      });

      const chosen = [outer, top, bottom, shoes].filter((c): c is Clothing => Boolean(c));
      chosen.forEach((c) => usage.set(c.id, (usage.get(c.id) ?? 0) + 1));

      let outfit: Outfit | null = null;
      if (top && bottom) outfit = { items: slotEntries(chosen), warmth: outfitWarmth(chosen) };
      else warnings.push('입을 수 있는 옷이 부족해 조합을 만들지 못했어요.');

      if (draft.weather && draft.weather.precipitationProbabilityMax >= RAIN_ALERT) {
        warnings.push(`비나 눈 올 확률이 ${draft.weather.precipitationProbabilityMax}%예요. 우산을 챙기세요.`);
      }

      const parts: string[] = [];
      if (draft.main) {
        const code = draft.main.analysis.dressCode ?? TPO_LABEL[draft.tpo];
        parts.push(`${draft.main.title} 일정이라 ${code} 기준으로 골랐어요.`);
        if (avoid.length > 0) parts.push(`${avoid.join(', ')} 계열은 뺐어요.`);
      } else {
        parts.push(`일정이 없어 ${TPO_LABEL[draft.tpo]} 차림으로 골랐어요.`);
      }
      if (draft.weather) {
        parts.push(`체감 ${Math.round(draft.weather.apparentMin)}~${Math.round(draft.weather.apparentMax)}℃에 맞춘 두께예요.`);
      }

      const layering =
        draft.weather && draft.weather.apparentMax - draft.weather.apparentMin >= LAYERING_RANGE && outer
          ? `아침 ${Math.round(draft.weather.apparentMin)}℃, 낮 ${Math.round(draft.weather.apparentMax)}℃라 낮에 벗을 수 있는 ${josa(itemLabel(outer), '을를')} 더했어요.`
          : null;

      plans.set(draft.date, {
        date: draft.date,
        tpo: draft.tpo,
        events: draft.events.map((e) => ({ id: e.id, title: e.title, startsAt: e.startsAt, tpo: e.analysis.tpo })),
        weather: draft.weather,
        requiredWarmth: required,
        outfit,
        reason: parts.join(' '),
        layeringTip: layering,
        warnings,
      });
    });

  // 세탁 역산: 날짜순으로 착용 횟수를 쌓아 보고, 세탁 기준에 닿은 옷은 다음에 입기 전까지 마르도록 마감 계산
  const wears = new Map(ctx.closet.map((c) => [c.id, c.wearsSinceWash]));
  const waiting = new Set(ctx.closet.filter((c) => c.status === 'LAUNDRY').map((c) => c.id));
  const lastWorn = new Map<string, string>();
  dates.forEach((date) => {
    const plan = plans.get(date)!;
    const draft = drafts.find((d) => d.date === date)!;
    plan.outfit?.items.forEach(({ item }) => {
      if (waiting.has(item.id) || (wears.get(item.id) ?? 0) >= item.washThreshold) {
        const dayStart = new Date(`${date}T07:00:00+09:00`);
        const deadline = new Date(dayStart.getTime() - (DRY_HOURS[item.category] ?? 24) * 3600_000);
        const previous = lastWorn.get(item.id);
        const earliest = previous ? new Date(`${previous}T22:00:00+09:00`) : ctx.now;
        if (deadline > earliest && deadline > ctx.now) {
          laundryTasks.push({
            itemIds: [item.id],
            itemNames: [itemLabel(item)],
            deadline: deadline.toISOString(),
            forDate: date,
            reason: `${weekdayOf(date)}요일 ${draft.main?.title ?? `${TPO_LABEL[draft.tpo]} 차림`}에 입으려면 이때까지 세탁을 시작해야 말라요.`,
          });
        } else {
          plan.warnings.push(`${josa(itemLabel(item), '은는')} 세탁할 틈 없이 다시 입게 돼요.`);
        }
        wears.set(item.id, 0);
        waiting.delete(item.id);
      }
      wears.set(item.id, (wears.get(item.id) ?? 0) + 1);
      lastWorn.set(item.id, date);
    });
  });

  return {
    startDate: ctx.start,
    days: dates.map((d) => plans.get(d)!),
    laundryTasks: laundryTasks.sort((a, b) => a.deadline.localeCompare(b.deadline)),
    conflicts,
    aiAvailable: false,
  };
}

// 하루 추천의 브라우저 계산. 옷차림 기준을 주면 그 기준의 일정이 있는 것처럼 계산하고, 꼭 입을 옷은 해당 칸에 고정
export function planDayLocal(input: {
  body: { date: string; anchorItemId?: string; tpo?: Tpo };
  closet: Clothing[];
  events: CalendarEvent[];
  daily: DailyWeather[];
  warmthBias: number;
}): DayPlan {
  const { body, closet, daily, warmthBias } = input;
  const events: CalendarEvent[] = body.tpo
    ? [
        {
          id: 'local-tpo',
          externalId: null,
          title: TPO_NAME[body.tpo],
          location: null,
          startsAt: `${body.date}T10:00:00+09:00`,
          endsAt: `${body.date}T11:00:00+09:00`,
          analysis: { ...analyzeEvent(''), tpo: body.tpo, formality: TPO_FORMALITY[body.tpo], importance: 5, clarifyQuestion: null },
        },
      ]
    : input.events;
  const week = planWeek({ start: body.date, closet, events, daily, warmthBias, now: new Date() });
  const day = { ...week.days[0], events: body.tpo ? [] : week.days[0].events };
  const anchor = closet.find((c) => c.id === body.anchorItemId);
  if (!anchor || anchor.category === 'ACCESSORY') return day;

  const slot = anchor.category;
  const kept = (day.outfit?.items ?? []).filter((entry) => {
    if (entry.slot === slot) return false;
    // 원피스는 상의 & 하의와 함께 입지 않음
    if (slot === 'DRESS') return entry.slot !== 'TOP' && entry.slot !== 'BOTTOM';
    if (slot === 'TOP' || slot === 'BOTTOM') return entry.slot !== 'DRESS';
    return true;
  });
  const items = [...kept, { slot, item: anchor }];
  return {
    ...day,
    outfit: { items, warmth: outfitWarmth(items.map((entry) => entry.item)) },
    reason: `${josa(itemLabel(anchor), '을를')} 꼭 입는 것으로 두고 나머지를 맞췄어요.`,
  };
}
