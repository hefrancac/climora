// Calendar helpers. Dates are plain `YYYY-MM-DD` strings and times are `HH:mm`.
// All arithmetic is done on UTC calendar days so no timezone conversion ever
// shifts a farmer's date. The forecast API is also asked for local times
// (timezone=auto), so both sides speak the same wall-clock language.

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** The user's own calendar day, read from the device clock. */
export function localToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function minutes(time: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN;
  const [hours = 0, mins = 0] = time.split(':').map(Number);
  return hours * 60 + mins;
}

export function timeFromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 04/12/2026 */
export function dateLabel(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

/** 04/12 */
export function shortDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

export function weekday(date: string): string {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? '';
}

/** "4 de dez" */
export function dayMonth(date: string): string {
  const [, month, day] = date.split('-');
  return `${Number(day)} de ${MONTHS[Number(month) - 1] ?? ''}`;
}

/** Hoje · Amanhã · Ontem · qui, 04/12 */
export function relativeDay(date: string, today: string): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  return `${weekday(date)}, ${shortDate(date)}`;
}

/** "10 fev 2027" */
export function shortFullDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? ''} ${year}`;
}

export const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'] as const;
export const MONTH_SHORT = MONTHS;
