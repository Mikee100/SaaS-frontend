import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PlanBasedNav from "@/components/PlanBasedNav";
import { UserProvider } from "@/components/UserContext";
import { SocketProvider } from "@/components/SocketContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SaaS Platform",
  description: "Modern SaaS platform with plan-based access control",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SocketProvider>
          <UserProvider>
            <PlanBasedNav />
            <main className="min-h-screen bg-gray-50">
              {children}
            </main>
          </UserProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
