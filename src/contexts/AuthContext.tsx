"use client";
import React, { createContext, useContext, ReactNode } from 'react';
import { useUser } from '@/components/UserContext';

interface AuthContextType {
  tenantId: string | undefined;
  userId: string | undefined;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user } = useUser();

  const value = React.useMemo(() => ({
    tenantId: user?.tenantId,
    userId: user?.id,
    isAuthenticated: !!user,
  }), [user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
