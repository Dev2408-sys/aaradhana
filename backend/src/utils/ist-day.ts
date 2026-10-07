/** Calendar day helpers in Asia/Kolkata. */

export function startOfIstDay(date: Date = new Date()): Date {
  const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  ist.setHours(0, 0, 0, 0);
  return ist;
}

export function endOfIstDay(date: Date = new Date()): Date {
  const d = startOfIstDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

/** Parse YYYY-MM-DD as an IST calendar day (local midnight representation). */
export function parseIstDate(dateStr?: string | null): Date {
  if (!dateStr?.trim()) return startOfIstDay();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return startOfIstDay();
  const d = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
  );
  d.setFullYear(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatIstDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
