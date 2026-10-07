export function rupee(n: unknown) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return '₹0';
  if (Math.abs(v) >= 100000) {
    return `₹${(v / 100000).toFixed(2)} L`;
  }
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function rupeeFull(n: unknown) {
  return `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function num(n: unknown) {
  return Number(n ?? 0).toLocaleString('en-IN');
}

export function pct(n: unknown) {
  return `${Number(n ?? 0).toFixed(1)}%`;
}
