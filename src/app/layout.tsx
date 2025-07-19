"use client";
import "./globals.css";
import type { ReactNode } from "react";
import DashboardShell from "@/components/DashboardShell";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        {isAuthPage ? (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">{children}</div>
        ) : (
          <DashboardShell>{children}</DashboardShell>
        )}
      </body>
    </html>
  );
}
