"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode, Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/utils/api";

export interface User {
  id: string;
  email: string;
  name?: string;
  roles?: string[]; // Added for RBAC
  isSuperadmin?: boolean; // <-- Add this line
  permissions?: string[]; // Add permissions property for RBAC
  receiptLogo?: string;
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
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Helper to fetch user
  // In UserContext.tsx
const fetchUser = async () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) {
    setUser(null);
    setLoading(false);
    return;
  }
  setLoading(true);
  try {
    const userData = await apiGet('/user/me');

    // Ensure roles is always an array and handle different role formats
    const roles = Array.isArray(userData.roles)
      ? userData.roles
      : (userData.role ? [userData.role] : []);

    // Create normalized user object
    const normalizedUser = {
      ...userData,
      roles,
      isSuperadmin: userData.isSuperadmin || roles.includes('superadmin') || roles.includes('admin')
    };

    // Sync branch context from backend/JWT
    if (userData.branchId) {
      localStorage.setItem('selectedBranchId', userData.branchId);
    }

  // ...existing code...
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
};

  // Initial fetch and storage event listener
  useEffect(() => {
    fetchUser();
    // Listen for login/logout in other tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token') fetchUser();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Login failed');
      }
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        await fetchUser();
        setError(null);
      } else {
        throw new Error('No token received');
      }
    } catch (err: any) {
      setUser(null);
      setError(err.message || 'Login failed');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setError(null);
    router.push('/login');
  };

  // Manual refresh
  const refreshUser = async () => {
    await fetchUser();
  };

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
  }), [user, loading, error]);

  return (
    <UserContext.Provider value={ctxValue}>
      {children}
    </UserContext.Provider>
  );
};

export function useUser(p0: never[]) {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
} 