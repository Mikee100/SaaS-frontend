/**
 * Enterprise auth client: cookie-based auth, no localStorage for tokens.
 * All requests use credentials: 'include' so access_token and refresh_token cookies are sent.
 */

const getApiUrl = () =>
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5100').replace(/\/+$/, '');

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  tenantId?: string | null;
  branchId?: string | null;
  roles?: string[];
  permissions?: string[];
  isSuperadmin?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh tokens using refresh_token cookie.
 * Returns true if refresh succeeded, false otherwise.
 */
export async function refreshAuth(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${getApiUrl()}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) return true;
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

/**
 * Get current user from /auth/me (cookie-based). Returns null if not authenticated.
 */
export async function getMe(): Promise<AuthUser | null> {
  const res = await fetch(`${getApiUrl()}/auth/me`, {
    credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
  });
  if (res.status === 401) {
    const refreshed = await refreshAuth();
    if (refreshed) {
      const retry = await fetch(`${getApiUrl()}/auth/me`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (retry.ok) return retry.json();
    }
    return null;
  }
  if (!res.ok) return null;
  return res.json();
}

/**
 * Login: POST /auth/login with credentials. Cookies are set by the server.
 */
export async function login(
  email: string,
  password: string,
  deviceFingerprint?: string,
  deviceName?: string,
): Promise<{ user: AuthUser }> {
  const res = await fetch(`${getApiUrl()}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      ...(deviceFingerprint && { deviceFingerprint }),
      ...(deviceName && { deviceName }),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Login failed: ${res.status}`);
  }
  return { user: data.user };
}

/**
 * Logout: POST /auth/logout to revoke session and clear cookies.
 */
export async function logout(): Promise<void> {
  await fetch(`${getApiUrl()}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
}
