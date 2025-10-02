"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBuilding, FaCogs, FaClipboardList, FaCreditCard, FaUserShield, FaChartBar, FaUsers, FaKey, FaImage, FaCrown, FaBell, FaPlug, FaShieldAlt, FaBars, FaTimes, FaEnvelope } from 'react-icons/fa';
import { useState } from 'react';

interface SettingsSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function SettingsSidebar({ collapsed = false, onToggle }: SettingsSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
    onToggle?.();
  };

  // Grouped sections with icons, including new features
  const groups = [
    {
      header: 'Organization',
      items: [
        { href: "/settings/business-info", label: "Business Info", icon: FaBuilding },
        { href: "/settings/logo", label: "Logo", icon: FaImage },
        { href: "/settings/users", label: "Users", icon: FaUsers },
        { href: "/settings/branches", label: "Branches", icon: FaBuilding },
        { href: "/settings/permissions", label: "Permissions", icon: FaUserShield },
        { href: "/settings/billing", label: "Billing", icon: FaCreditCard },
        { href: "/settings/enterprise", label: "Enterprise Features", icon: FaCrown },
        { href: "/settings/statistics", label: "Statistics", icon: FaChartBar },
        { href: "/settings/notifications", label: "Notifications", icon: FaBell },
        { href: "/settings/integrations", label: "Integrations", icon: FaPlug },
      ]
    },
    {
      header: 'Account',
      items: [
        { href: "/settings/preferences", label: "Preferences", icon: FaCogs },
        { href: "/settings/password", label: "Password", icon: FaKey },
        { href: "/settings/security", label: "Security", icon: FaShieldAlt },
      ]
    },
    {
      header: 'Audit',
      items: [
        { href: "/settings/audit-logs", label: "Audit Logs", icon: FaClipboardList },
      ]
    },
    {
      header: 'Support',
      items: [
        { href: "/settings/contact", label: "Contact Admin", icon: FaEnvelope },
      ]
    }
  ];

  const iconClass = isCollapsed ? 'w-6 h-6' : 'w-4 h-4 mr-3';

  return (
    <nav className={`h-screen fixed top-0 left-0 z-30 bg-gradient-to-b from-blue-50 to-white border-r border-gray-200 py-8 px-2 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-60'}`}>
      <div className="mb-6 flex items-center justify-between px-4">
        {!isCollapsed && <div className="text-lg font-bold text-blue-700">Settings</div>}
        <button
          onClick={toggleCollapsed}
          className="p-1 text-blue-600 hover:text-blue-800 rounded transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <FaBars className="w-5 h-5" /> : <FaTimes className="w-5 h-5" />}
        </button>
      </div>
      <ul className="flex-1 space-y-6 overflow-y-auto">
        {groups.map((group) => (
          <li key={group.header}>
            {!isCollapsed && (
              <div className="text-xs uppercase tracking-wider text-gray-400 px-4 mb-2 font-semibold">
                {group.header}
              </div>
            )}
            <ul className="space-y-1">
              {group.items.map((s) => {
                const active = pathname === s.href;
                return (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      className={`flex items-center py-2 px-4 rounded-lg transition-all duration-200 font-medium text-sm
                        ${active 
                          ? 'bg-blue-100 text-blue-700 shadow-sm border-l-4 border-blue-600' 
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                        }
                        ${isCollapsed ? 'justify-center px-2' : ''}
                      `}
                      title={isCollapsed ? s.label : undefined}
                    >
                      <s.icon className={`${iconClass} flex-shrink-0 text-gray-600 ${active ? 'text-blue-700' : ''}`} />
                      {!isCollapsed && <span className="whitespace-nowrap">{s.label}</span>}
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
