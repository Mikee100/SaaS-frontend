"use client";

import AuthGuard from "@/components/AuthGuard";

// In (admin)/layout.tsx
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard adminOnly>
      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
        {children}
      </div>
    </AuthGuard>
  );
}