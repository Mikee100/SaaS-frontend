'use client';

import React from 'react';
import Link from 'next/link';
import { useUser } from '@/components/UserContext';
import { useRouter, usePathname } from 'next/navigation';
import { FiCreditCard, FiSettings, FiUser, FiFileText, FiDollarSign } from 'react-icons/fi';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  const isActive = (href: string) =>
    pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-white shadow-sm border-r border-gray-200 shrink-0">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>

          <nav className="space-y-2">
            <Link
              href="/account"
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/account') &&
                !isActive('/account/billing') &&
                !isActive('/account/invoices') &&
                !isActive('/account/payments') &&
                !isActive('/account/settings')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FiUser className="mr-3 h-4 w-4" />
              Profile
            </Link>

            <Link
              href="/account/billing"
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/account/billing')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FiCreditCard className="mr-3 h-4 w-4" />
              Billing & Subscription
            </Link>

            <Link
              href="/account/invoices"
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/account/invoices')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FiFileText className="mr-3 h-4 w-4" />
              Invoices
            </Link>

            <Link
              href="/account/settings"
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/account/settings')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FiSettings className="mr-3 h-4 w-4" />
              Settings
            </Link>

            <Link
              href="/account/payments"
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/account/payments')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FiDollarSign className="mr-3 h-4 w-4" />
              Payments
            </Link>
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
