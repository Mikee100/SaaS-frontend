"use client";

import { ReactNode, Suspense, useEffect } from "react";
import { UserProvider, useUser } from "@/components/UserContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import dynamic from "next/dynamic";
import AuthPageWrapper from "@/components/AuthPageWrapper";
import { usePathname } from "next/navigation";

// Dynamically import client-side components with no SSR
const LayoutWrapper = dynamic(() => import("@/components/LayoutWrapper"), { ssr: false });
const ClientBranchProvider = dynamic(() => import("@/components/ClientBranchProvider"), { ssr: false });
const ServiceWorkerWrapper = dynamic(() => import('@/components/ServiceWorkerWrapper'), { ssr: false });

function ClientContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Check if current path is an auth path - don't fetch user data for auth pages
  const isAuthPath = () => {
    if (typeof window === 'undefined') return false;
    const path = pathname || window.location.pathname;
    return path === '/login' ||
           path === '/register' ||
           path === '/forgot-password' ||
           path === '/reset-password' ||
           path.startsWith('/superadmin');
  };

  // CRITICAL: Don't call useUser at all for auth pages to prevent redirect loops
  const { user } = isAuthPath() ? { user: null } : (() => {
    try {
      return useUser([]);
    } catch (e) {
      console.log('Error calling useUser, likely outside UserProvider:', e);
      return { user: null };
    }
  })();

  // Debug logging - only for non-auth pages
  useEffect(() => {
    if (!isAuthPath()) {
      console.log('User in ClientLayout:', {
        fullUserObject: user,
        userId: user?.id,
        userRoles: user?.roles,
        userBranchId: user?.branchId,
        canChangeBranch: user?.roles?.includes('owner') || user?.roles?.includes('admin'),
        currentPath: pathname
      });

      if (user?.roles) {
        console.log('User roles type:', typeof user.roles, Array.isArray(user.roles) ? 'is array' : 'is not array');
        console.log('User roles content:', JSON.stringify(user.roles));
      }
    }
  }, [user, pathname, isAuthPath]);

  // Don't render branch providers for auth pages
  if (isAuthPath()) {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
        <ServiceWorkerWrapper />
      </Suspense>
    );
  }

  return (
    <BranchProvider
      initialBranchId={user?.branchId}
    >
      <ClientBranchProvider>
        <Suspense fallback={<div>Loading...</div>}>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
          <ServiceWorkerWrapper />
        </Suspense>
      </ClientBranchProvider>
    </BranchProvider>
  );
}

function AuthContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Check if current path is an auth path
  const isAuthPath = () => {
    if (typeof window === 'undefined') return false;
    const path = pathname || window.location.pathname;
    return path === '/login' ||
           path === '/register' ||
           path === '/forgot-password' ||
           path === '/reset-password' ||
           path.startsWith('/superadmin');
  };

  // For auth pages, don't wrap with UserProvider (handled by AuthPageWrapper)
  // For non-auth pages, render with full UserProvider
  if (isAuthPath()) {
    return <ClientContent>{children}</ClientContent>;
  }

  return (
    <UserProvider>
      <ClientContent>
        {children}
      </ClientContent>
    </UserProvider>
  );
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ReactQueryProvider>
      <ThemeProvider>
        <DashboardProvider>
          <AuthContent>
            {children}
          </AuthContent>
        </DashboardProvider>
      </ThemeProvider>
    </ReactQueryProvider>
  );
}
