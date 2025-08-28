import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// Removed SessionProvider (NextAuth) import
import LayoutWrapper from "@/components/LayoutWrapper";
import ClientBranchProvider from "@/components/ClientBranchProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import OfflineIndicator from '@/components/ui/OfflineIndicator';
import { Toaster } from '@/components/ui/toaster';
import React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SaaS Platform",
  description: "Modern SaaS platform with plan-based access control",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SaaS Platform"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SaaS Platform" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-TileImage" content="/icon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('Service Worker registered successfully:', registration);
                    })
                    .catch(function(error) {
                      console.log('Service Worker registration failed:', error);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <DashboardProvider>
          <ClientBranchProvider>
            {children}
          </ClientBranchProvider>
        </DashboardProvider>
      </body>
    </html>
  );
}
