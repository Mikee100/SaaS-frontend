"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode, Dispatch, SetStateAction, useCallback } from "react";
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

export const UserProvider: React.FC<UserProviderProps> = ({ children, skipUserFetch = false }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  
  // Helper to fetch user
  const fetchUser = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

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

      setUser(normalizedUser);
      setError(null);
    } catch (err) {
      console.error('Error fetching user:', err);
      setUser(null);
      setError('Authentication failed. Please log in again.');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed, or add dependencies if you use any from props/state

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

// ...existing code...
  useEffect(() => {
    // CRITICAL: If skipUserFetch is true, completely skip all authentication logic
    if (skipUserFetch) {
      console.log('Skipping user fetch for auth page');
      setUser(null);
      setLoading(false);
      setError(null);
      return;
    }

    // CRITICAL: Never fetch user data on auth pages to prevent redirect loops
    if (isAuthPath()) {
      console.log('Auth page detected, completely skipping user fetch:', pathname);
      setUser(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Only fetch user data for non-auth pages
    fetchUser();

    // Listen for login/logout in other tabs - only for non-auth pages
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token' && !isAuthPath() && !skipUserFetch) {
        fetchUser();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [skipUserFetch, pathname, isAuthPath, fetchUser]);
// ...existing code...
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

          // Refresh user data from the server
          await fetchUser();

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
    setUser(null);
    setError(null);
    router.push('/login');
  }, [router]);

  // 2. Wrap 'refreshUser' in useCallback
  // Manual refresh
  const refreshUser = useCallback(async () => {
    await fetchUser();
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