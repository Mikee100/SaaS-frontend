"use client";

import { usePathname } from "next/navigation";
import PlanBasedNav from "@/components/PlanBasedNav";
import ImpersonationBanner from "@/components/ImpersonationBanner";

import { SidebarProvider, useSidebar } from "@/components/SidebarContext";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sidebarCollapsed } = useSidebar();

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

  const isAIAssistant = pathname === '/ai-assistant';

  return (
    <>
      {showImpersonationBanner && <ImpersonationBanner />}
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

