import React from 'react';
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import AuthPageWrapper from "@/components/AuthPageWrapper";

// Configure Inter font with optimized loading
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
  other: {
    'theme-color': '#2563eb',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default'
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
}: {
  children: React.ReactNode;
}) {
  // Log layout rendering
  if (typeof window !== 'undefined') {
    console.log('RootLayout - Current path:', window.location.pathname);
    console.log('RootLayout - Rendering with children:', React.Children.count(children));
  }

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} font-sans`}>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            console.log('RootLayout - Client-side path:', window.location.pathname);
            console.log('RootLayout - Document referrer:', document.referrer);
            
            // Log all redirects
            const originalPush = history.pushState;
            history.pushState = function(...args) {
              console.log('History pushState called:', args);
              return originalPush.apply(history, args);
            };
            
            // Log all redirects via router
            const originalReplaceState = history.replaceState;
            history.replaceState = function(...args) {
              console.log('History replaceState called:', args);
              return originalReplaceState.apply(history, args);
            };
            
            // Log all link clicks
            document.addEventListener('click', (e) => {
              const target = e.target as HTMLElement;
              const link = target.closest('a');
              if (link) {
                console.log('Link clicked:', {
                  href: link.href,
                  pathname: link.pathname,
                  target: link.target,
                  isExternal: link.hostname !== window.location.hostname
                });
              }
            }, true);
          `
        }} />
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
        <AuthPageWrapper>
          {children}
        </AuthPageWrapper>
      </body>
    </html>
  );
}
