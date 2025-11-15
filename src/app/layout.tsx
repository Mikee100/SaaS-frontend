import React from 'react';
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthPageWrapper from "@/components/AuthPageWrapper";

// Configure Inter font with optimized loading
const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: "Adeera Software - SaaS Platform",
  description: "Modern SaaS platform with plan-based access control",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Adeera Software"
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
        <script src="https://www.google.com/recaptcha/api.js?render=explicit" async defer></script>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Adeera Software" />
        <link rel="apple-touch-icon" href="https://www.adeeraunitech.com/Adeera_logo.jpg" />
        {/* Remove the local favicon line to avoid conflicts */}
        {/* <link rel="icon" href="/favicon.svg" type="image/svg+xml" /> */}
        {/* Use only the external image as favicon */}
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        {/* Remove any other favicon lines */}
        <link rel="preload" href="/_next/static/css/app/layout.css" as="style" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-TileImage" content="https://www.adeeraunitech.com/Adeera_logo.jpg" />
        {/* Use a local favicon in public/ for best results */}
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthPageWrapper>
          {children}
        </AuthPageWrapper>
      </body>
    </html>
  );
}
