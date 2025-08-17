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
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // Check if user is authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if admin access is required
    if (adminOnly || pathname.startsWith('/admin')) {
      const isAdmin = user.roles?.includes('admin') || user.roles?.includes('superadmin') || user.isSuperadmin;
      if (!isAdmin) {
        console.log('Admin access denied - redirecting to /');
        router.push('/');
      }
    }
  }, [user, loading, router, pathname, adminOnly]);

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
    const isAdmin = user.roles?.includes('admin') || user.roles?.includes('superadmin') || user.isSuperadmin;
    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 text-lg">Access Denied. You don't have permission to view this page.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}