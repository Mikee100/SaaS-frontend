"use client";

import { usePathname } from "next/navigation";
import { ReactNode, useMemo } from "react";
import ClientLayout from "@/app/ClientLayout";
import { UserProvider } from "@/components/UserContext";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";

const AUTH_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/api/',
  '/_next/'
];

function isAuthPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (AUTH_PATHS.includes(pathname)) return true;
  return AUTH_PATHS.some(path => pathname.startsWith(path));
}

interface AuthPageWrapperProps {
  children: ReactNode;
}

export default function AuthPageWrapper({ children }: AuthPageWrapperProps) {
  const pathname = usePathname();
  // Derive from pathname so it's never stale after navigation (no useState + useEffect lag)
  const isAuthPage = useMemo(() => isAuthPath(pathname ?? ''), [pathname]);

  // Single UserProvider for the whole app so login state persists when navigating from /login to /
  return (
    <ReactQueryProvider>
      <UserProvider skipUserFetch={isAuthPage}>
        {isAuthPage ? (
          <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
            {children}
          </div>
        ) : (
          <ClientLayout>
            {children}
          </ClientLayout>
        )}
      </UserProvider>
    </ReactQueryProvider>
  );
}
