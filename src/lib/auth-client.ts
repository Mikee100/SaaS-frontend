/**
 * Enterprise auth client: cookie-based auth, no localStorage for tokens.
 * All requests use credentials: 'include' so access_token and refresh_token cookies are sent.
 */

const getApiUrl = () =>
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7050').replace(/\/+$/, '');

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  tenantId?: string | null;
  branchId?: string | null;
  roles?: string[];
  permissions?: string[];
  isSuperadmin?: boolean;
  adminRoles?: string[];
}

export type LoginResult =
  | { status: 'ok'; user: AuthUser }
  | { status: 'mfa_enroll' }
  | { status: 'mfa_pending' };

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
): Promise<LoginResult> {
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
  if (data.mfaEnrollmentRequired) {
    return { status: 'mfa_enroll' };
  }
  if (data.mfaRequired) {
    return { status: 'mfa_pending' };
  }
  return { status: 'ok', user: data.user };
}

/**
 * Complete a pending MFA login with a TOTP code (or a backup code).
 */
export async function verifyMfa(input: { code?: string; backupCode?: string }): Promise<{ user: AuthUser }> {
  const res = await fetch(`${getApiUrl()}/auth/mfa/verify`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `MFA verification failed: ${res.status}`);
  }
  return { user: data.user };
}

/**
 * Begin MFA enrollment (first login for a platform-staff account): generates a TOTP
 * secret and returns a QR code for an authenticator app.
 */
export async function setupMfa(): Promise<{ secret: string; otpauthUri: string; qrCodeDataUrl: string }> {
  const res = await fetch(`${getApiUrl()}/auth/mfa/setup`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `MFA setup failed: ${res.status}`);
  }
  return data;
}

/**
 * Confirm MFA enrollment with the first code from the authenticator app.
 * Returns backup codes (shown exactly once) and completes the session.
 */
export async function enableMfa(code: string): Promise<{ backupCodes: string[]; user: AuthUser }> {
  const res = await fetch(`${getApiUrl()}/auth/mfa/enable`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `MFA enable failed: ${res.status}`);
  }
  return data;
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
