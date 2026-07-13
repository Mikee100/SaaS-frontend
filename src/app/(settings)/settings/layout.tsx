"use client";
import SettingsSidebar from '@/components/SettingsSidebar';
import { useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950">
      <SettingsSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main 
        className="flex-1 flex flex-col transition-all duration-300 ease-in-out"
        style={{
          marginLeft: sidebarCollapsed ? '4rem' : '15rem',
          padding: '2rem 2.5rem',
          maxWidth: '1200px',
          width: '100%',
        }}
      >
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <FaArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
