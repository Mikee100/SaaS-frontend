"use client";

import { usePathname } from "next/navigation";
import PlanBasedNav from "@/components/PlanBasedNav";
import { UserProvider } from "@/components/UserContext";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Check if current path is in a route group (auth, admin, settings)
  const isInRouteGroup = pathname.startsWith('/login') || 
                        pathname.startsWith('/register') || 
                        pathname.startsWith('/forgot-password') || 
                        pathname.startsWith('/reset-password') ||
                        pathname.startsWith('/superadmin') ||
                        pathname.startsWith('/settings');

  return (
    <UserProvider>
      {!isInRouteGroup && <PlanBasedNav />}
      <main className={!isInRouteGroup ? "lg:ml-64 min-h-screen bg-gray-50" : "min-h-screen bg-gray-50"}>
        {children}
      </main>
    </UserProvider>
  );
} 