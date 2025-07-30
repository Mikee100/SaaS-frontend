"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBuilding, FaCogs, FaClipboardList, FaCreditCard, FaUserShield, FaUsers, FaKey, FaImage, FaCrown } from 'react-icons/fa';

export default function SettingsSidebar() {
  const pathname = usePathname();
  // Grouped sections with icons
  const groups = [
    {
      header: 'Organization',
      items: [
        { href: "/settings/business-info", label: "Business Info", icon: <FaBuilding className="mr-2" /> },
        { href: "/settings/logo", label: "Logo", icon: <FaImage className="mr-2" /> },
        { href: "/settings/users", label: "Users", icon: <FaUsers className="mr-2" /> },
        { href: "/settings/permissions", label: "Permissions", icon: <FaUserShield className="mr-2" /> },
        { href: "/settings/billing", label: "Billing", icon: <FaCreditCard className="mr-2" /> },
        { href: "/settings/enterprise", label: "Enterprise Features", icon: <FaCrown className="mr-2" /> },
      ]
    },
    {
      header: 'Account',
      items: [
        { href: "/settings/preferences", label: "Preferences", icon: <FaCogs className="mr-2" /> },
        { href: "/settings/password", label: "Password", icon: <FaKey className="mr-2" /> },
      ]
    },
    {
      header: 'Audit',
      items: [
        { href: "/settings/audit-logs", label: "Audit Logs", icon: <FaClipboardList className="mr-2" /> },
      ]
    }
  ];
  return (
    <nav className="w-60 h-screen fixed top-0 left-0 z-30 bg-gradient-to-b from-blue-50 to-white border-r border-gray-200 py-8 px-2 flex flex-col">
      <div className="mb-6 text-lg font-bold text-blue-700 px-4">Settings</div>
      <ul className="flex-1 space-y-6">
        {groups.map(group => (
          <li key={group.header}>
            <div className="text-xs uppercase tracking-wider text-gray-400 px-4 mb-2 font-semibold">{group.header}</div>
            <ul className="space-y-1">
              {group.items.map(s => {
                const active = pathname === s.href;
                return (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      className={`flex items-center px-4 py-2 rounded-lg transition font-medium text-sm
                        ${active ? 'bg-blue-100 text-blue-700 shadow border-l-4 border-blue-600' : 'text-gray-700 hover:bg-blue-50'}
                      `}
                    >
                      {s.icon}
                      {s.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
} 