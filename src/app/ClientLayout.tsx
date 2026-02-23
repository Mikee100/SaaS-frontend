"use client";

import { ReactNode, Suspense, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { AuthProvider } from "@/contexts/AuthContext";
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

  // Cookie-based auth: redirect to login if no user and not loading
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);


  return (
    <AuthProvider>
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
    </AuthProvider>
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
