"use client";
import "./globals.css";
import type { ReactNode } from "react";
import DashboardShell from "@/components/DashboardShell";
import { usePathname } from "next/navigation";
import MainNavbar from '../components/MainNavbar';
import Spinner from '../components/Spinner';
import { Suspense } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isSettings = pathname.startsWith('/settings');

  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        {!isSettings && <MainNavbar />}
        {isAuthPage ? (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">{children}</div>
        ) : (
          <DashboardShell>
            <Suspense fallback={<Spinner size={48} className="my-24" />}>{children}</Suspense>
          </DashboardShell>
        )}
      </body>
    </html>
  );
}
