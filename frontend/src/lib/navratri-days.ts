/** Kesariya Navratri 4.0 — 11 Oct 2026 → 20 Oct 2026 (Day 1–10). */

export type NavratriDayInfo = {
  day: number;
  date: string;
  label: string;
  shortLabel: string;
  calendarDay: number;
  monthShort: string;
};

export type EventLifecycle = 'UPCOMING' | 'LIVE' | 'COMPLETED';

const YEAR = 2026;
const MONTH = 10;
const START = 11;
const END = 20;

function nowInIst(now = new Date()) {
  return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

export function getNavratriDays(): NavratriDayInfo[] {
  return Array.from({ length: 10 }, (_, i) => {
    const day = i + 1;
    const calendarDay = START + i;
    const date = `${YEAR}-${String(MONTH).padStart(2, '0')}-${String(calendarDay).padStart(2, '0')}`;
    return {
      day,
      date,
      calendarDay,
      monthShort: 'Oct',
      label: `Day ${day} · ${calendarDay} Oct`,
      shortLabel: `Day ${day}`,
    };
  });
}

export function suggestNavratriDay(now = new Date()): number | null {
  const ist = nowInIst(now);
  if (ist.getFullYear() !== YEAR || ist.getMonth() + 1 !== MONTH) return null;
  const d = ist.getDate();
  if (d < START || d > END) return null;
  return d - START + 1;
}

export function getEventLifecycle(now = new Date()): EventLifecycle {
  const ist = nowInIst(now);
  const start = new Date(YEAR, MONTH - 1, START, 0, 0, 0);
  const end = new Date(YEAR, MONTH - 1, END, 23, 59, 59);
  if (ist < start) return 'UPCOMING';
  if (ist > end) return 'COMPLETED';
  return 'LIVE';
}

export function getGreeting(now = new Date()): string {
  const hour = nowInIst(now).getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Demo login accounts (seed). Password: Kesariya@123 — see docs/DEMO_CREDENTIALS.md */
export const DEV_LOGIN_ACCOUNTS = [
  { role: 'Super Admin', mobile: '9999999999', name: 'Kesariya Super Admin' },
  { role: 'Admin', mobile: '8888888888', name: 'Kesariya Event Admin' },
  { role: 'Master Seller', mobile: '7777777777', name: 'Rahul Patel (KSR001)' },
  { role: 'Seller', mobile: '6666666666', name: 'Amit Patel (KSR002)' },
  { role: 'Seller', mobile: '9122000001', name: 'Aarav Patel (S01)' },
] as const;
