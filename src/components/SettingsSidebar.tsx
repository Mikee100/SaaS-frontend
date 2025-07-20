"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SettingsSidebar() {
  const pathname = usePathname();
  const sections = [
    { href: "/settings", label: "Business Info" },
    { href: "/settings/preferences", label: "Preferences" },
    { href: "/settings/audit-logs", label: "Audit Logs" },
    { href: "/settings/billing", label: "Billing" },
    { href: "/settings/permissions", label: "Permissions" },
    { href: "/settings/users", label: "Users" },
    { href: "/settings/password", label: "Password" },
    { href: "/settings/logo", label: "Logo" },
    { href: "/settings/business-info", label: "Business Info (Advanced)" },
  ];
  return (
    <nav
      style={{
        width: 240,
        minHeight: '100vh',
        background: '#f7fafd',
        borderRight: '1px solid #e5e7eb',
        padding: '2rem 0.5rem',
        position: 'sticky',
        top: 0,
        left: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
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