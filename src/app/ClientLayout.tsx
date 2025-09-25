"use client";

import { ReactNode, Suspense, useEffect, useState, useCallback } from "react";
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
const ServiceWorkerWrapper = dynamic(() => import("@/components/ServiceWorkerWrapper"), { ssr: false });

function ClientContent({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();
  const pathname = usePathname();

  // Debug logging
  useEffect(() => {
    console.log('ClientContent - Current path:', pathname);
    console.log('ClientContent - User state:', {
      hasUser: !!user,
      userId: user?.id,
      userRoles: user?.roles,
      userBranchId: user?.branchId,
      canChangeBranch: user?.roles?.includes('owner') || user?.roles?.includes('admin'),
      loading: loading
    });

    // Log more details about the user object structure
    if (user) {
      console.log('ClientContent - Full user object:', JSON.stringify(user, null, 2));
      console.log('ClientContent - User roles type:', typeof user.roles, Array.isArray(user.roles) ? 'is array' : 'is not array');
      console.log('ClientContent - User roles content:', JSON.stringify(user.roles));
    }
  }, [user, loading, pathname]);
  
  // Log component mount/unmount
  useEffect(() => {
    console.log('ClientContent - Mounted');
    return () => {
      console.log('ClientContent - Unmounted');
    };
  }, []);

  return (
    <BranchProvider
      initialBranchId={user?.branchId}
      canChangeBranch={user?.roles?.includes('owner') || user?.roles?.includes('admin')}
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

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ReactQueryProvider>
      <ThemeProvider>
        <DashboardProvider>
          <UserProvider>
            <ClientContent>
              {children}
            </ClientContent>
          </UserProvider>
        </DashboardProvider>
      </ThemeProvider>
    </ReactQueryProvider>
  );
}
