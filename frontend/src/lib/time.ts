/**
 * Salon time helpers (timezone hotfix, B-1).
 *
 * Rule: the browser's time zone is NEVER used. Every instant coming from the API is real
 * UTC (ISO-8601 with the Berlin offset) and is displayed explicitly in Europe/Berlin;
 * "today", weekdays and day arithmetic are done on plain calendar dates, not on Date objects
 * in local time. No dependencies, no `getHours()`/`getDate()` on local time anywhere.
 */

export const SALON_TZ = 'Europe/Berlin';
const LOCALE = 'de-DE';

const toDate = (value: string | Date): Date => (typeof value === 'string' ? new Date(value) : value);

/** Format an instant in salon time with arbitrary Intl options. */
export function formatSalon(value: string | Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: SALON_TZ }).format(toDate(value));
}

/** "09:00" */
export function formatSalonTime(value: string | Date): string {
  return formatSalon(value, { hour: '2-digit', minute: '2-digit' });
}

/** "Dienstag, 13. Oktober 2026 um 09:00" style, as used on the confirmation/cancel pages. */
export function formatSalonDateTimeLong(value: string | Date): string {
  return formatSalon(value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "13. Oktober 2026 um 09:00" (no weekday), used for deadlines. */
export function formatSalonDeadline(value: string | Date): string {
  return formatSalon(value, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "13.10.2026, 09:00" */
export function formatSalonDateTimeNumeric(value: string | Date): string {
  return formatSalon(value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "13.10.2026" for an instant, in salon time. */
export function formatSalonDate(value: string | Date): string {
  return formatSalon(value, { day: 'numeric', month: 'numeric', year: 'numeric' });
}

/**
 * Format a plain calendar date ("YYYY-MM-DD", no time, no zone). The string is interpreted as
 * that calendar day and formatted in UTC so it can never shift to the previous/next day.
 */
export function formatDateOnly(dateStr: string, options: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

function salonParts(value: Date): { year: string; month: string; day: string; hour: string; minute: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SALON_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
}

/** Today's calendar date in salon time, "YYYY-MM-DD" (never the UTC date). */
export function salonToday(now: Date = new Date()): string {
  const p = salonParts(now);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Calendar-date arithmetic ("YYYY-MM-DD" + n days), independent of any time zone or DST. */
export function addDaysISO(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Weekday of a calendar date, 0 = Monday … 6 = Sunday (matches salon_hours.day_of_week). */
export function weekdayMonday0(dateStr: string): number {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Value for <input type="datetime-local"> showing the instant in salon time: "2026-10-13T09:00". */
export function toSalonInputValue(value: string | Date): string {
  const p = salonParts(toDate(value));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
