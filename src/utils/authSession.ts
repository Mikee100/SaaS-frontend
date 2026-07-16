/**
 * The real auth token lives in an httpOnly cookie set by the backend, which is
 * on a different origin in production (Vercel frontend + duckdns API) and so
 * never reaches this app's own server-side code (middleware, RSCs). This
 * same-origin, non-httpOnly marker cookie carries no secret — it only lets
 * middleware.ts know a login has happened, so it can gate /dashboard and
 * /profile at the edge instead of relying solely on a client-side redirect.
 */
const SESSION_MARKER_COOKIE = 'has_session';

export function setSessionMarker(): void {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${SESSION_MARKER_COOKIE}=1; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secure}`;
}

export function clearSessionMarker(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${SESSION_MARKER_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
