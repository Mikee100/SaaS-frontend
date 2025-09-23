"use client";

import { ReactNode, Suspense, useEffect } from "react";
import { UserProvider, useUser } from "@/components/UserContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import dynamic from "next/dynamic";

// Dynamically import client-side components with no SSR
const LayoutWrapper = dynamic(() => import("@/components/LayoutWrapper"), { ssr: false });
const ClientBranchProvider = dynamic(() => import("@/components/ClientBranchProvider"), { ssr: false });
const ServiceWorkerWrapper = dynamic(() => import('@/components/ServiceWorkerWrapper'), { ssr: false });

function ClientContent({ children }: { children: ReactNode }) {
  const { user } = useUser();
  
  // Debug logging
  useEffect(() => {
    console.log('User in ClientLayout:', {
      fullUserObject: user,
      userId: user?.id,
      userRoles: user?.roles,
      userBranchId: user?.branchId,
      canChangeBranch: user?.roles?.includes('owner') || user?.roles?.includes('admin')
    });
    
    if (user?.roles) {
      console.log('User roles type:', typeof user.roles, Array.isArray(user.roles) ? 'is array' : 'is not array');
      console.log('User roles content:', JSON.stringify(user.roles));
    }
  }, [user]);
  
  return (
    <BranchProvider 
      userRole={user?.roles?.[0]}
      userBranchId={user?.branchId}
      initialBranchId={user?.branchId}
      userId={user?.id}
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
