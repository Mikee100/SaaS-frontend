"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBuilding, FaCogs, FaClipboardList, FaCreditCard, FaUserShield, FaUsers, FaKey, FaImage, FaBell, FaPlug, FaShieldAlt, FaBars, FaTimes, FaEnvelope, FaFileAlt } from 'react-icons/fa';
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
        { href: "/settings/pos-display-name", label: "POS Display Name", icon: FaFileAlt },
        { href: "/settings/pdf-templates", label: "Report / PDF Design", icon: FaFileAlt },
        { href: "/settings/report-preferences", label: "Report Preferences", icon: FaFileAlt },
        { href: "/settings/users", label: "Users", icon: FaUsers },
        { href: "/settings/branches", label: "Branches", icon: FaBuilding },
        { href: "/settings/permissions", label: "Permissions", icon: FaUserShield },
        { href: "/settings/billing", label: "Billing", icon: FaCreditCard },
        { href: "/settings/notifications", label: "Notifications", icon: FaBell },
        { href: "/settings/integrations", label: "Integrations", icon: FaPlug },
        { href: "/settings/modules", label: "Modules", icon: FaCogs },
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

  const iconClass = isCollapsed ? 'w-4 h-4' : 'w-4 h-4 mr-3';

  return (
    <nav className={`fixed top-0 left-0 z-30 h-screen border-r border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-60'}`}>
      <div className={`flex items-center justify-between ${isCollapsed ? 'px-3 py-4' : 'px-4 py-6'} border-b border-gray-200 dark:border-slate-700`}>
        {!isCollapsed && <div className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Settings</div>}
        {!isCollapsed && (
          <button
            onClick={toggleCollapsed}
            className="rounded-lg border border-transparent p-2 text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Collapse sidebar"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        )}
      </div>
      <ul className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        {isCollapsed && (
          <li className="mb-3 px-2">
            <button
              onClick={toggleCollapsed}
              className="group relative flex w-full items-center justify-center rounded-lg border border-transparent py-2.5 text-gray-700 transition-all duration-200 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Expand sidebar"
            >
              <FaBars className="h-4 w-4 text-gray-600 dark:text-zinc-400" />
              <span className="absolute left-full z-50 ml-2 whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100">
                Expand Sidebar
              </span>
            </button>
          </li>
        )}
        {groups.map((group, groupIndex) => (
          <li key={group.header} className={groupIndex > 0 ? 'mt-6' : ''}>
            {!isCollapsed && (
              <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-slate-500 px-4 mb-3 font-semibold">
                {group.header}
              </div>
            )}
            {isCollapsed && groupIndex > 0 && (
              <div className="h-px bg-gray-200 dark:bg-slate-600 mx-2 my-3"></div>
            )}
            <ul className={`${isCollapsed ? 'space-y-2' : 'space-y-1'}`}>
              {group.items.map((s) => {
                const active = pathname === s.href || pathname === s.href.split('#')[0];
                return (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      className={`group relative flex items-center rounded-lg border transition-all duration-200 font-medium text-sm
                        ${active 
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300' 
                          : 'border-transparent text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                        }
                        ${isCollapsed 
                          ? 'justify-center py-2.5 px-2 mx-2' 
                          : 'py-2.5 px-4'
                        }
                      `}
                      style={active ? { boxShadow: 'inset 2px 0 0 0 var(--adeera-accent)' } : undefined}
                    >
                      <s.icon className={`${iconClass} shrink-0 transition-colors ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-zinc-400'}`} />
                      {!isCollapsed && <span className="whitespace-nowrap ml-1">{s.label}</span>}
                      {isCollapsed && (
                        <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-slate-700 text-white dark:text-slate-100 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 border border-slate-600">
                          {s.label}
                        </span>
                      )}
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

