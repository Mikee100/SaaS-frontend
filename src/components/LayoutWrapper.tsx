"use client";

import { usePathname } from "next/navigation";
import PlanBasedNav from "@/components/PlanBasedNav";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { useUser } from "@/components/UserContext";
import { useBillingAccessStatus } from "@/hooks/useBillingAccessStatus";

import { SidebarProvider, useSidebar } from "@/components/SidebarContext";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sidebarCollapsed } = useSidebar();
  const { user } = useUser();
  const { data: accessStatus, isLoading: accessStatusLoading } =
    useBillingAccessStatus();

  // Check if current path is in a route group (auth, admin, settings)
  const isInRouteGroup = pathname && (
    pathname.startsWith('/(auth)') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/settings')
  );

  const showImpersonationBanner = !isInRouteGroup && pathname && !pathname.startsWith('/superadmin');
  const showAccessRestrictionBanner =
    !isInRouteGroup &&
    !accessStatusLoading &&
    !!user &&
    !user.isSuperadmin &&
    accessStatus.restricted;

  const isAIAssistant = pathname === '/ai-assistant';

  return (
    <>
      {showImpersonationBanner && <ImpersonationBanner />}
      {showAccessRestrictionBanner && (
        <div className={`mx-2 mt-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 lg:mr-4 lg:mt-3 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">Subscription Access Restricted</p>
              <p className="text-amber-800">
                {accessStatus.reason ||
                  "Your subscription has expired and your account is currently restricted. Renew to continue using all features."}
              </p>
            </div>
            <a
              href={accessStatus.renewalPath || '/account/billing'}
              className="inline-flex items-center justify-center rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              Open Billing
            </a>
          </div>
        </div>
      )}
      {!isInRouteGroup && <PlanBasedNav />}
      <main className={`${isAIAssistant ? 'min-h-screen' : 'min-h-screen'} bg-gray-50 transition-all duration-300 ${!isInRouteGroup
        ? sidebarCollapsed
          ? 'lg:ml-16'
          : 'lg:ml-64'
        : ''
        }`}>
        {children}
      </main>
      {!isAIAssistant && (
        <footer className="bg-white border-t border-gray-200 py-2 px-4 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} Adeera Company. All rights reserved. | Software by Adeera Company | <a href="https://www.adeeraunitech.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Visit our website</a>
        </footer>
      )}
    </>
  );
}

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}

