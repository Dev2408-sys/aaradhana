/** Normalize mobile to digits-only for lookup/storage consistency. */
export function normalizeMobile(mobile: string): string {
  return mobile.replace(/[^\d]/g, '');
}
