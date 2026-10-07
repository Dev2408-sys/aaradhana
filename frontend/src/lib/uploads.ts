const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

/** Resolve API origin for static /uploads paths (supports relative `/api`). */
export function apiOrigin() {
  if (API_BASE.startsWith('/')) {
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  }
  try {
    const u = new URL(API_BASE);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:4000';
  }
}

/** Resolve relative `/uploads/...` or data URLs for <img src> */
export function mediaUrl(pathOrUrl: string | null | undefined) {
  if (!pathOrUrl) return null;
  if (
    pathOrUrl.startsWith('http://') ||
    pathOrUrl.startsWith('https://') ||
    pathOrUrl.startsWith('data:')
  ) {
    return pathOrUrl;
  }
  if (pathOrUrl.startsWith('/')) {
    const origin = apiOrigin();
    return origin ? `${origin}${pathOrUrl}` : pathOrUrl;
  }
  return pathOrUrl;
}
