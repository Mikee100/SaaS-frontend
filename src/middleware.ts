import { NextRequest, NextResponse } from "next/server";

/**
 * The real session lives in an httpOnly cookie set by the backend, which in
 * production is on a different origin (Vercel frontend + duckdns API) and
 * never reaches this server. `has_session` is a same-origin marker cookie
 * set client-side by UserContext right after a successful login (see
 * src/utils/authSession.ts) purely so this middleware has something to check
 * — it is not itself a credential. Actual authorization of every request
 * still happens on the backend via the real JWT.
 */
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has('has_session');
  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

// Previously this only matched /dashboard and /profile, but almost none of the
// app's protected pages (e.g. /accounting, /crm, /hr, /sales, /superadmin,
// /(settings)/*) actually live under /dashboard, so they were unprotected
// regardless of the check above. Gate everything except the known-public
// auth pages, the shareable receipt view, Next.js API routes (which enforce
// their own auth against the backend), and static assets.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api|login|register|forgot-password|reset-password|receipt|favicon.ico|.*\\..*).*)',
  ],
};