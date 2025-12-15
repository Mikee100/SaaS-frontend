"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode, Dispatch, SetStateAction, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiGet } from "@/utils/api";

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
  // Add more fields as needed
}

interface UserContextType {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
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
  const router = useRouter();
  const pathname = usePathname();
  
  // Refs to prevent concurrent requests and track initialization
  const fetchingRef = useRef(false);
  const initializedRef = useRef(false);
  
  // Helper to fetch user with caching and request deduplication
  const fetchUser = useCallback(async (forceRefresh: boolean = false) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setUser(null);
      clearUserCache();
      setLoading(false);
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedUser();
      if (cached.isValid && cached.user) {
        setUser(cached.user);
        setError(null);
        setLoading(false);
        return;
      }
    }

    // Prevent concurrent requests
    if (fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    
    try {
      const userData = await apiGet('/user/me') as User;

      if (!userData) {
        throw new Error('No user data received');
      }

      // Ensure roles and permissions are always arrays
      const roles = Array.isArray(userData.roles) ? userData.roles : [];
      const permissions = Array.isArray(userData.permissions) ? userData.permissions : [];

      // Create normalized user object with all required fields
      const normalizedUser: User = {
        id: userData.id,
        email: userData.email || '',
        name: userData.name || '',
        roles,
        permissions,
        isSuperadmin: userData.isSuperadmin || roles.includes('superadmin') || roles.includes('admin'),
        tenantId: userData.tenantId,
        branchId: userData.branchId,
        receiptLogo: userData.receiptLogo
      };

      // Sync branch context from backend/JWT
      if (userData.branchId) {
        localStorage.setItem('selectedBranchId', userData.branchId);
      }

      // Update cache and state
      setCachedUser(normalizedUser);
      setUser(normalizedUser);
      setError(null);
    } catch (err) {
      console.error('Error fetching user:', err);
      setUser(null);
      clearUserCache();
      setError('Authentication failed. Please log in again.');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // 1. Wrap 'isAuthPath' in useCallback to stabilize its reference
  const isAuthPath = useCallback(() => {
    if (typeof window === 'undefined') {
      console.log('isAuthPath: Running on server, returning false');
      return false;
    }
    const path = pathname || window.location.pathname;
    const isAuth = path === '/login' ||
                  path === '/register' ||
                  path === '/forgot-password' ||
                  path === '/reset-password' ||
                  path.startsWith('/api/') ||
                  path.startsWith('/_next/');
    
    console.log(`isAuthPath: Path '${path}' is ${isAuth ? 'an auth path' : 'not an auth path'}`);
    return isAuth;
  }, [pathname]);

  // Initialize user data only once on mount (not on every route change)
  useEffect(() => {
    // CRITICAL: If skipUserFetch is true, completely skip all authentication logic
    if (skipUserFetch) {
      console.log('Skipping user fetch for auth page');
      setUser(null);
      setLoading(false);
      setError(null);
      initializedRef.current = true;
      return;
    }

    // CRITICAL: Never fetch user data on auth pages to prevent redirect loops
    if (isAuthPath()) {
      console.log('Auth page detected, completely skipping user fetch:', pathname);
      setUser(null);
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
    }
  }, [pathname, skipUserFetch, isAuthPath, fetchUser]);

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

  // 2. Wrap 'login', 'logout', and 'refreshUser' in useCallback
  // Login function
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL  || 'http://localhost:9000'   ||  'https://saas-business.duckdns.org').replace(/\/+$/, '');
      const loginUrl = `${apiUrl}/auth/login`;
      console.log('Attempting to login to:', loginUrl);

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify({ email, password })
      });

      console.log('Login response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('Login error response:', errorData);
          throw new Error(errorData.message || `Login failed with status ${response.status}`);
        } catch (e) {
          console.error('Failed to parse error response:', e);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const loginResponse = await response.json();
      console.log('Full login response:', loginResponse);
      const { access_token, user } = loginResponse;

      if (access_token) {
        console.log('Saving token to localStorage:', access_token);
        localStorage.setItem('token', access_token);
        console.log('Token in localStorage after set:', localStorage.getItem('token'));

        // Update user state with the user data from the response
        if (user) {
          const { roles = [], permissions = [] } = user;
          const normalizedUser: User = {
            id: user.id,
            email: user.email,
            name: user.name || '',
            roles: Array.isArray(roles) ? roles : [],
            permissions: Array.isArray(permissions) ? permissions : [],
            isSuperadmin: user.isSuperadmin || roles.includes('superadmin') || roles.includes('admin'),
            tenantId: user.tenantId,
            branchId: user.branchId,
            receiptLogo: user.receiptLogo
          };
          setUser(normalizedUser);

          // Store branch ID if available
          if (user.branchId) {
            localStorage.setItem('selectedBranchId', user.branchId);
          }

          // Cache the user from login response immediately
          setCachedUser(normalizedUser);
          
          // Refresh user data from the server (force refresh to ensure latest data)
          await fetchUser(true);

          // Redirect based on user role
          const isSuperAdmin = normalizedUser.isSuperadmin || normalizedUser.roles?.includes('superadmin');
          const isAdmin = normalizedUser.roles?.includes('admin');

          if (isSuperAdmin) {
            router.push('/superadmin');
          } else if (isAdmin) {
            router.push('/admin');
          } else {
            router.push('/');
          }
        }
      } else {
        throw new Error('No access token received in response');
      }
   } catch (err) {
  setUser(null);
  // Fix: Specify error type
  setError((err instanceof Error ? err.message : 'Login failed'));
  localStorage.removeItem('token');
}finally {
      setLoading(false);
    }
  }, [router, fetchUser]);

  // 2. Wrap 'logout' in useCallback
  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    clearUserCache();
    setUser(null);
    setError(null);
    initializedRef.current = false; // Reset initialization flag
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

  // Memoize context value
  const ctxValue = React.useMemo(() => ({
    user,
    setUser,
    loading,
    error,
    login,
    logout,
    refreshUser,
    clearError,
  }), [user, loading, error, login, logout, refreshUser]);

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