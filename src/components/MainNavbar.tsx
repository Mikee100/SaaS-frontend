"use client";
import Link from 'next/link';
import { hasPermission } from '@/utils/permissions';
import { useUser } from './UserContext';

export default function MainNavbar() {
  const { user } = useUser();
  const isAdmin = user?.roles?.includes('owner') || user?.roles?.includes('manager');
  return (
    <nav style={{ width: '100%', padding: '1rem', background: '#fff', borderBottom: '1px solid #eee', display: 'flex', gap: 24, alignItems: 'center' }}>
      <span style={{ fontWeight: 'bold' }}>My SaaS Platform</span>
      <Link href="/sales/history">Sales</Link>
      <Link href="/receipts">Receipts</Link>
      {hasPermission(user, 'manage_settings') && <Link href="/settings">Settings</Link>}
      {isAdmin && <Link href="/users">User Management</Link>}
    </nav>
  );
} 