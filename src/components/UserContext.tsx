"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode, Dispatch, SetStateAction, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiGet, apiPost } from "@/utils/api";
import { login as authLogin, logout as authLogout } from "@/lib/auth-client";
import { AppModuleKey, CrmEntitlements, normalizeCrmEntitlements, normalizeEnabledModules } from '@/utils/moduleAccess';
import { getEffectiveTenantManifest } from '@/utils/manifest/manifestClient';
import { setSessionMarker, clearSessionMarker } from '@/utils/authSession';

export interface User {
  id: string;
  email: string;
  name?: string;
  roles?: string[]; // Added for RBAC
  isSuperadmin?: boolean; // <-- Add this line
  permissions?: string[]; // Add permissions property for RBAC
  receiptLogo?: string;
  tenantId?: string;
  branchId?: string;
  impersonating?: boolean;
  impersonatingAsTenantName?: string | null;
  enabledModules?: AppModuleKey[];
  crmEntitlements?: CrmEntitlements;
  restaurantFeaturesEnabled?: boolean;
  // Add more fields as needed
}

interface UserContextType {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  loading: boolean;
  error: string | null;
  entitlementsSyncedAt: number | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void | Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  endImpersonation?: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
  skipUserFetch?: boolean; // Add this prop to skip user fetching
}

// Cache configuration
const USER_CACHE_KEY = 'user_cache_data';
const USER_CACHE_TIMESTAMP_KEY = 'user_cache_timestamp';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

// Cache utilities
const getCachedUser = (): { user: User | null; isValid: boolean } => {
  if (typeof window === 'undefined') return { user: null, isValid: false };
  
  try {
    const cachedData = localStorage.getItem(USER_CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(USER_CACHE_TIMESTAMP_KEY);
    
    if (!cachedData || !cachedTimestamp) {
      return { user: null, isValid: false };
    }
    
    const timestamp = parseInt(cachedTimestamp, 10);
    const now = Date.now();
    const isValid = (now - timestamp) < CACHE_TTL_MS;
    
    if (!isValid) {
      // Clear expired cache
      localStorage.removeItem(USER_CACHE_KEY);
      localStorage.removeItem(USER_CACHE_TIMESTAMP_KEY);
      return { user: null, isValid: false };
    }
    
    return { user: JSON.parse(cachedData), isValid: true };
  } catch (error) {
    console.error('Error reading user cache:', error);
    return { user: null, isValid: false };
  }
};

const setCachedUser = (user: User | null): void => {
  if (typeof window === 'undefined') return;
  
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
      localStorage.setItem(USER_CACHE_TIMESTAMP_KEY, Date.now().toString());
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
      localStorage.removeItem(USER_CACHE_TIMESTAMP_KEY);
    }
  } catch (error) {
    console.error('Error setting user cache:', error);
  }
};

const clearUserCache = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_CACHE_KEY);
  localStorage.removeItem(USER_CACHE_TIMESTAMP_KEY);
};

export const UserProvider: React.FC<UserProviderProps> = ({ children, skipUserFetch = false }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entitlementsSyncedAt, setEntitlementsSyncedAt] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const userRef = useRef<User | null>(null);
  userRef.current = user;

  // Refs to prevent concurrent requests and track initialization
  const fetchingRef = useRef(false);
  const initializedRef = useRef(false);
  
  // Cookie-based auth: fetch user via /user/me (cookies sent with credentials: 'include')
  const fetchUser = useCallback(async (forceRefresh: boolean = false) => {
    const cached = !forceRefresh ? getCachedUser() : { user: null, isValid: false };
    const hasCachedUser = !!(cached.isValid && cached.user);

    if (!forceRefresh) {
      if (hasCachedUser) {
        setUser(cached.user);
        if (typeof window !== 'undefined') {
          const cachedTimestamp = Number(localStorage.getItem(USER_CACHE_TIMESTAMP_KEY) || 0);
          setEntitlementsSyncedAt(cachedTimestamp > 0 ? cachedTimestamp : null);
        }
        setError(null);
        setLoading(false);
      }
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (!hasCachedUser) {
      setLoading(true);
    }

    try {
      const userData = await apiGet('/user/me') as User;
      if (!userData) throw new Error('No user data received');

      let effectiveModules: AppModuleKey[] | null = null;
      try {
        const manifestResponse = await getEffectiveTenantManifest();
        effectiveModules = normalizeEnabledModules(
          manifestResponse?.manifest?.enabledModules,
        );
      } catch {
        effectiveModules = null;
      }

      const roles = Array.isArray(userData.roles) ? userData.roles : [];
      const permissions = Array.isArray(userData.permissions) ? userData.permissions : [];
      const normalizedUser: User = {
        id: userData.id,
        email: userData.email || '',
        name: userData.name || '',
        roles,
        permissions,
        isSuperadmin: userData.isSuperadmin || roles.includes('superadmin') || roles.includes('admin'),
        tenantId: userData.tenantId,
        branchId: userData.branchId,
        receiptLogo: userData.receiptLogo,
        impersonating: userData.impersonating ?? false,
        impersonatingAsTenantName: userData.impersonatingAsTenantName ?? null,
        enabledModules:
          effectiveModules && effectiveModules.length > 0
            ? effectiveModules
            : normalizeEnabledModules((userData as { enabledModules?: unknown }).enabledModules),
        crmEntitlements: normalizeCrmEntitlements((userData as { crmEntitlements?: unknown }).crmEntitlements),
        restaurantFeaturesEnabled: Boolean((userData as { restaurantFeaturesEnabled?: boolean }).restaurantFeaturesEnabled),
      };

      if (userData.branchId && typeof window !== 'undefined') {
        localStorage.setItem('selectedBranchId', userData.branchId);
      }

      setEntitlementsSyncedAt(Date.now());
      setCachedUser(normalizedUser);
      setUser(normalizedUser);
      setError(null);
    } catch (err) {
      const isUnauthorized = err instanceof Error && (err.message === 'Unauthorized' || err.message.includes('401'));
      if (!isUnauthorized) {
        console.error('Error fetching user:', err);
      }
      // Don't clear user on 401 when we already have one (e.g. cross-origin cookies not sent after login)
      if (!userRef.current) {
        setUser(null);
        setEntitlementsSyncedAt(null);
        clearUserCache();
        setError('Authentication failed. Please log in again.');
        if (typeof window !== 'undefined') localStorage.removeItem('token');
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // 1. Wrap 'isAuthPath' in useCallback to stabilize its reference
  const isAuthPath = useCallback(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const path = pathname || window.location.pathname;
    const isAuth = path === '/login' ||
                  path === '/register' ||
                  path === '/forgot-password' ||
                  path === '/reset-password' ||
                  path.startsWith('/api/') ||
                  path.startsWith('/_next/');
    
    return isAuth;
  }, [pathname]);

  // Initialize user data only once on mount (not on every route change)
  useEffect(() => {
    // When skipUserFetch is true (auth pages), only skip fetch and set loading false - do NOT clear user
    // so that after login, when we navigate to /, we don't clear user (pathname updates before skipUserFetch in some trees)
    if (skipUserFetch) {
      setLoading(false);
      setError(null);
      initializedRef.current = true;
      return;
    }

    // On auth pages (by pathname), clear user so login form shows
    if (isAuthPath()) {
      setUser(null);
      setEntitlementsSyncedAt(null);
      setLoading(false);
      setError(null);
      initializedRef.current = true;
      return;
    }

    // Only fetch once on initial mount, not on every route change
    if (!initializedRef.current) {
      initializedRef.current = true;
      fetchUser(false); // Use cache if available
    }
  }, [skipUserFetch, isAuthPath, fetchUser, pathname]); // Only run once on mount or when skipUserFetch changes

  // Handle pathname changes - clear state when navigating to auth pages (but don't refetch on route changes)
  useEffect(() => {
    if (skipUserFetch) return;
    
    if (isAuthPath()) {
      // Clear user state when navigating to auth pages
      setUser(null);
      setLoading(false);
      setError(null);
    } else if (!initializedRef.current) {
      // If we navigate from auth to non-auth and haven't initialized yet, fetch once
      initializedRef.current = true;
      fetchUser(false);
    } else if (!user && localStorage.getItem('token')) {
      // If we have a token but no user (e.g., after login redirect), fetch user data
      initializedRef.current = true;
      fetchUser(true);
    }
  }, [pathname, skipUserFetch, isAuthPath, fetchUser, user]);

  // Listen for login/logout in other tabs
  useEffect(() => {
    if (skipUserFetch || isAuthPath()) return;

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token' && !isAuthPath() && !skipUserFetch) {
        // Clear cache on token change from other tabs
        clearUserCache();
        fetchUser(true); // Force refresh on storage event
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [skipUserFetch, isAuthPath, fetchUser]);
  // Additional effect to prevent redirects on auth pages
  useEffect(() => {
    if (isAuthPath() || skipUserFetch) {
      // Ensure loading is false and no errors on auth pages to prevent loading states and redirects
      setLoading(false);
      setError(null);
    }
  }, [pathname, skipUserFetch, isAuthPath]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { user: loginUser } = await authLogin(email, password);
      if (!loginUser) throw new Error('No user in response');

      let effectiveModules: AppModuleKey[] | null = null;
      try {
        const manifestResponse = await getEffectiveTenantManifest();
        effectiveModules = normalizeEnabledModules(
          manifestResponse?.manifest?.enabledModules,
        );
      } catch {
        effectiveModules = null;
      }

      const { roles = [], permissions = [] } = loginUser;
      const normalizedUser: User = {
        id: loginUser.id,
        email: loginUser.email || '',
        name: loginUser.name || '',
        roles: Array.isArray(roles) ? roles : [],
        permissions: Array.isArray(permissions) ? permissions : [],
        isSuperadmin: loginUser.isSuperadmin || (Array.isArray(roles) && (roles.includes('superadmin') || roles.includes('admin'))),
        tenantId: loginUser.tenantId ?? undefined,
        branchId: loginUser.branchId ?? undefined,
        receiptLogo: (loginUser as User).receiptLogo,
        enabledModules:
          effectiveModules && effectiveModules.length > 0
            ? effectiveModules
            : normalizeEnabledModules((loginUser as { enabledModules?: unknown }).enabledModules),
        crmEntitlements: normalizeCrmEntitlements((loginUser as { crmEntitlements?: unknown }).crmEntitlements),
      };

      if (loginUser.branchId && typeof window !== 'undefined') {
        localStorage.setItem('selectedBranchId', loginUser.branchId);
      }

      setEntitlementsSyncedAt(Date.now());
      setCachedUser(normalizedUser);
      setUser(normalizedUser);
      setLoading(false);
      setError(null);
      setSessionMarker();
      // Keep initialized so we don't refetch on redirect (avoids 401/hang when cookies aren't sent cross-origin)
      initializedRef.current = true;
      await new Promise((r) => setTimeout(r, 100));

      const isSuperAdmin = normalizedUser.isSuperadmin || normalizedUser.roles?.includes('superadmin');
      const isAdmin = normalizedUser.roles?.includes('admin');
      if (isSuperAdmin) router.push('/superadmin');
      else if (isAdmin) router.push('/admin');
      else router.push('/');

      // Don't refetch here: cross-origin cookies often aren't sent, so /user/me would 401 and we'd clear user and redirect back to login
    } catch (err) {
      setUser(null);
      setEntitlementsSyncedAt(null);
      setError(err instanceof Error ? err.message : 'Login failed');
      if (typeof window !== 'undefined') localStorage.removeItem('token');
      clearSessionMarker();
    } finally {
      setLoading(false);
    }
  }, [router, fetchUser]);

  const logout = useCallback(async () => {
    await authLogout();
    if (typeof window !== 'undefined') localStorage.removeItem('token');
    clearSessionMarker();
    clearUserCache();
    setUser(null);
    setEntitlementsSyncedAt(null);
    setError(null);
    initializedRef.current = false;
    router.push('/login');
  }, [router]);

  // 2. Wrap 'refreshUser' in useCallback
  // Manual refresh - forces a fresh API call
  const refreshUser = useCallback(async () => {
    clearUserCache();
    await fetchUser(true); // Force refresh
  }, [fetchUser]);

  // Clear error
  const clearError = () => setError(null);

  // End impersonation: clear cookie, refresh user, redirect to superadmin
  const endImpersonation = useCallback(async () => {
    try {
      await apiPost('/admin/impersonate/end', {});
      clearUserCache();
      await fetchUser(true);
      router.push('/superadmin');
    } catch (err) {
      console.error('Failed to end impersonation:', err);
      clearUserCache();
      await fetchUser(true);
      router.push('/superadmin');
    }
  }, [fetchUser, router]);

  // Memoize context value
  const ctxValue = React.useMemo(() => ({
    user,
    setUser,
    loading,
    error,
    entitlementsSyncedAt,
    login,
    logout,
    refreshUser,
    clearError,
    endImpersonation,
  }), [user, loading, error, entitlementsSyncedAt, login, logout, refreshUser, endImpersonation]);

  return (
    <UserContext.Provider value={ctxValue}>
      {children}
    </UserContext.Provider>
  );
};

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}