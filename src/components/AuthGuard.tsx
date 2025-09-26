// In AuthGuard.tsx
"use client";
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from './UserContext';
import { FaSpinner } from 'react-icons/fa';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  adminOnly?: boolean;
}

export default function AuthGuard({ children, fallback, adminOnly = false }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname() || '';

  // Define authentication-related paths that should be accessible without login
  const authPaths = ['/login', '/forgot-password', '/reset-password', '/superadmin'];
  const isAuthPath = authPaths.some(path => pathname === path || pathname.startsWith(path));

  // Always call useUser at the top level - this is required by React hooks rules
  const { user, loading } = useUser();

  useEffect(() => {
    // Skip all redirect logic for auth pages
    if (isAuthPath) {
      console.log('Auth page detected in AuthGuard, skipping redirects:', pathname);
      return;
    }

    if (loading) return;

    // Check if user is authenticated for non-auth pages
    if (!user) {
      console.log('No user found, redirecting to login from:', pathname);
      router.push('/login');
      return;
    }

    // Check if admin access is required
    if (adminOnly || pathname.startsWith('/admin')) {
      const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('superadmin') || user?.isSuperadmin;
      if (!isAdmin) {
        console.log('Admin access denied - redirecting to /');
        router.push('/');
      }
    }
  }, [user, loading, router, pathname, adminOnly, isAuthPath]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <FaSpinner className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <p className="text-gray-600 text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If no user and not loading, show fallback or redirect
  if (!user) {
    return fallback || (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <FaSpinner className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <p className="text-gray-600 text-lg">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Check admin access in render phase as well
  if (adminOnly || pathname.startsWith('/admin')) {
    const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('superadmin') || user?.isSuperadmin;
    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 text-lg">Access Denied. You don&apos;t have permission to view this page.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}