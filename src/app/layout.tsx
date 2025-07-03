import "./globals.css";
import type { ReactNode } from "react";
import DashboardShell from "@/components/DashboardShell";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
