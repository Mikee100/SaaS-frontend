"use client";

import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import ClientLayout from "@/app/ClientLayout";
import { UserProvider } from "@/components/UserContext";

interface AuthPageWrapperProps {
  children: ReactNode;
}

export default function AuthPageWrapper({ children }: AuthPageWrapperProps) {
  const pathname = usePathname();
  const [isAuthPage, setIsAuthPage] = useState(false);

  useEffect(() => {
    if (!pathname) return;

    const authPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/superadmin'];
    const isAuth = authPaths.some(path =>
      pathname === path || pathname.startsWith(path + '/')
    );
    setIsAuthPage(isAuth);
  }, [pathname]);

  if (isAuthPage) {
    // For auth pages, provide minimal UserProvider that doesn't fetch user data
    // but still allows login functionality
    return (
      <UserProvider skipUserFetch={true}>
        <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
          {children}
        </div>
      </UserProvider>
    );
  }

  // For non-auth pages, apply ClientLayout (which includes UserProvider)
  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  );
}
