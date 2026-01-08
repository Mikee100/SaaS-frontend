"use client";

import { ReactNode, Suspense, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";

// Dynamically import client-side components with no SSR
const LayoutWrapper = dynamic(() => import("@/components/LayoutWrapper"), { ssr: false });
const ClientBranchProvider = dynamic(() => import("@/components/ClientBranchProvider"), { ssr: false });
const ServiceWorkerWrapper = dynamic(() => import("@/components/ServiceWorkerWrapper"), { ssr: false });

function ClientContent({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  // Redirect to login if no user, not loading, and no token
  useEffect(() => {
    if (!loading && !user && !localStorage.getItem('token')) {
      router.push('/login');
    }
  }, [user, loading, router]);


  return (
    <BranchProvider
      initialBranchId={user?.branchId}
      canChangeBranch={user?.roles?.includes('owner')}
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
    <ThemeProvider>
      <DashboardProvider>
        <ClientContent>
          {children}
        </ClientContent>
      </DashboardProvider>
    </ThemeProvider>
  );
}
