"use client";
import SettingsSidebar from '@/components/SettingsSidebar';
import { useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f7fafd'
    }}>
      <SettingsSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main style={{
        flex: 1,
        padding: '2.5rem 2rem',
        maxWidth: 900,
        margin: '0 auto',
        background: 'none',
        borderRadius: 0,
        boxShadow: 'none',
        minHeight: 'calc(100vh - 4rem)',
        display: 'flex',
        flexDirection: 'column',
        marginLeft: sidebarCollapsed ? '4rem' : '15rem', // Adjust margin based on collapsed state
        transition: 'margin-left 0.3s ease',
      }}>
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
