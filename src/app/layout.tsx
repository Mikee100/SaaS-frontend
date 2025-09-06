import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";
import ClientBranchProvider from "@/components/ClientBranchProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import OfflineIndicator from '@/components/ui/OfflineIndicator';

import { ReactQueryProvider } from '@/providers/ReactQueryProvider';
import React from "react";
import ServiceWorkerWrapper from '@/components/ServiceWorkerWrapper';

// Optimize font loading with display: 'swap' and preload
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
});

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
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  other: {
    'theme-color': '#2563eb',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
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
    <html lang="en" suppressHydrationWarning className={`${inter.variable} font-sans`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SaaS Platform" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="preload" href="/_next/static/css/app/layout.css" as="style" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-TileImage" content="/icon.svg" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ReactQueryProvider>
          <ThemeProvider>
            <DashboardProvider>
              <BranchProvider>
                <ClientBranchProvider>
                  
                    <LayoutWrapper>
                      {children}
                    </LayoutWrapper>
                  
                    {/* Service Worker Registration */}
                    <ServiceWorkerWrapper />
                </ClientBranchProvider>
              </BranchProvider>
            </DashboardProvider>
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
