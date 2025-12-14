"use client";

import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState, useCallback } from "react";
import ClientLayout from "@/app/ClientLayout";
import { UserProvider } from "@/components/UserContext";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";

interface AuthPageWrapperProps {
  children: ReactNode;
}

export default function AuthPageWrapper({ children }: AuthPageWrapperProps) {
  const pathname = usePathname();
  const [isAuthPage, setIsAuthPage] = useState(false);

  // Memoize the auth path check to prevent unnecessary re-renders
  const checkIfAuthPath = useCallback((currentPathname: string) => {
    if (!currentPathname) {
      console.log('checkIfAuthPath: No pathname provided, returning false');
      return false;
    }
    
    const authPaths = [
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
    
    // Check direct matches first
    if (authPaths.includes(currentPathname)) {
      console.log(`checkIfAuthPath: Path '${currentPathname}' is an exact auth path match`);
      return true;
    }
    
    // Check if path starts with any auth path
    const isAuthPath = authPaths.some(path => currentPathname.startsWith(path));
    console.log(`checkIfAuthPath: Path '${currentPathname}' ${isAuthPath ? 'starts with an auth path' : 'is not an auth path'}`);
    
    return isAuthPath;
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const isAuth = checkIfAuthPath(pathname);
    console.log('AuthPageWrapper - pathname:', pathname, 'isAuth:', isAuth);
    setIsAuthPage(isAuth);
  }, [pathname, checkIfAuthPath]);

  // Always wrap with ReactQueryProvider to ensure it's available for all pages
  // For auth pages, use a minimal layout without the full app shell
  if (isAuthPage) {
    return (
      <ReactQueryProvider>
        <UserProvider skipUserFetch={true}>
          <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
            {children}
          </div>
        </UserProvider>
      </ReactQueryProvider>
    );
  }

  // For non-auth pages, use the full app layout with all providers
  return (
    <ReactQueryProvider>
      <UserProvider>
        <ClientLayout>
          {children}
        </ClientLayout>
      </UserProvider>
    </ReactQueryProvider>
  );
}
