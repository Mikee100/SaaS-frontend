"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sections = [
  { href: '/settings/business-info', label: 'Business Info' },
  { href: '/settings/logo', label: 'Logo Upload' },
  { href: '/settings/password', label: 'Password Change' },
  { href: '/settings/users', label: 'Team/User Management' },
  { href: '/settings/permissions', label: 'Permissions' },
  { href: '/settings/billing', label: 'Billing' },
  { href: '/settings/audit-logs', label: 'Audit Logs' },
];

export default function SettingsSidebar() {
  const pathname = usePathname();
  return (
    <nav style={{
      width: 260,
      background: '#f7fafd',
      padding: '2rem 0.5rem',
      minHeight: '100vh',
      borderRight: '1px solid #e5e7eb',
      fontFamily: 'Inter, sans-serif',
    }}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {sections.map((s) => {
          const active = pathname === s.href;
          return (
            <li key={s.href} style={{ margin: '0.5rem 0' }}>
              <Link
                href={s.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem 1.25rem',
                  borderRadius: 8,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#2563eb' : '#222',
                  background: active ? 'rgba(37,99,235,0.08)' : 'none',
                  borderLeft: active ? '4px solid #2563eb' : '4px solid transparent',
                  transition: 'background 0.15s, color 0.15s',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
} 