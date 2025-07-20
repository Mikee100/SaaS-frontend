"use client";
import "./globals.css";
import type { ReactNode } from "react";
import DashboardShell from "@/components/DashboardShell";
import { usePathname } from "next/navigation";
import MainNavbar from '../components/MainNavbar';
import Spinner from '../components/Spinner';
import { Suspense } from 'react';
import { UserProvider } from '../components/UserContext';
import { SocketProvider } from '../components/SocketContext';

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isExternalPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/settings");

  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <SocketProvider>
          <UserProvider>
            {isExternalPage ? (
              // For settings, just render children directly (no centering div)
              children
            ) : (
              <DashboardShell>
                <Suspense fallback={<Spinner size={48} className="my-24" />}>{children}</Suspense>
              </DashboardShell>
            )}
          </UserProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
