"use client";

import { usePathname } from "next/navigation";
import PlanBasedNav from "@/components/PlanBasedNav";
import { UserProvider } from "@/components/UserContext";
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

  return (
    <>
      {!isInRouteGroup && <PlanBasedNav />}
      <main className={`min-h-screen bg-gray-50 transition-all duration-300 ${
        !isInRouteGroup
          ? sidebarCollapsed
            ? 'lg:ml-16'
            : 'lg:ml-64'
          : ''
      }`}>
        {children}
      </main>
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
