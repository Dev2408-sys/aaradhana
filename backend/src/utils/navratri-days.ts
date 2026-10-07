/** Kesariya Navratri 4.0 — 11 Oct 2026 → 20 Oct 2026 (Day 1–10). */

export const NAVRATRI_YEAR = 2026;
export const NAVRATRI_MONTH = 10; // October
export const NAVRATRI_START_DAY = 11;
export const NAVRATRI_END_DAY = 20;
export const NAVRATRI_TOTAL_DAYS = 10;

export type NavratriDayInfo = {
  day: number;
  /** YYYY-MM-DD (event calendar day in India) */
  date: string;
  label: string;
  shortLabel: string;
};

export function getNavratriDays(): NavratriDayInfo[] {
  return Array.from({ length: NAVRATRI_TOTAL_DAYS }, (_, i) => {
    const day = i + 1;
    const calendarDay = NAVRATRI_START_DAY + i;
    const date = `${NAVRATRI_YEAR}-${String(NAVRATRI_MONTH).padStart(2, '0')}-${String(calendarDay).padStart(2, '0')}`;
    return {
      day,
      date,
      label: `Day ${day} · ${calendarDay} Oct`,
      shortLabel: `Day ${day}`,
    };
  });
}

export function isValidNavratriDay(day: number) {
  return Number.isInteger(day) && day >= 1 && day <= NAVRATRI_TOTAL_DAYS;
}

/** UTC midnight for the Navratri calendar day (stable for DB date storage). */
export function eventDateForDay(day: number): Date {
  if (!isValidNavratriDay(day)) {
    throw new Error(`Invalid Navratri day: ${day}`);
  }
  const calendarDay = NAVRATRI_START_DAY + day - 1;
  return new Date(Date.UTC(NAVRATRI_YEAR, NAVRATRI_MONTH - 1, calendarDay));
}

export function dayFromEventDate(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  if (y !== NAVRATRI_YEAR || m !== NAVRATRI_MONTH) return null;
  if (day < NAVRATRI_START_DAY || day > NAVRATRI_END_DAY) return null;
  return day - NAVRATRI_START_DAY + 1;
}

/** Suggest today's Navratri day if "now" falls in the festival window (IST). */
export function suggestNavratriDay(now = new Date()): number | null {
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const y = ist.getFullYear();
  const m = ist.getMonth() + 1;
  const d = ist.getDate();
  if (y !== NAVRATRI_YEAR || m !== NAVRATRI_MONTH) return null;
  if (d < NAVRATRI_START_DAY || d > NAVRATRI_END_DAY) return null;
  return d - NAVRATRI_START_DAY + 1;
}
