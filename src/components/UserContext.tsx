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
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Helper to fetch user
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
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000');
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
        }
        
        // Refresh user data from the server
        await fetchUser();
      } else {
        throw new Error('No access token received in response');
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