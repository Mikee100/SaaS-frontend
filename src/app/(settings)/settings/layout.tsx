"use client";
import SettingsSidebar from '@/components/SettingsSidebar';
import { useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
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
            className="inline-flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:text-gray-900 hover:bg-white rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-gray-200 hover:border-gray-300"
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
