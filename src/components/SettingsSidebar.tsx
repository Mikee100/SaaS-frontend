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
        { href: "/settings/pdf-templates", label: "Report / PDF Design", icon: FaFileAlt },
        { href: "/settings/users", label: "Users", icon: FaUsers },
        { href: "/settings/branches", label: "Branches", icon: FaBuilding },
        { href: "/settings/permissions", label: "Permissions", icon: FaUserShield },
        { href: "/settings/billing", label: "Billing", icon: FaCreditCard },
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

  const iconClass = isCollapsed ? 'w-4 h-4' : 'w-4 h-4 mr-3';

  return (
    <nav className={`h-screen fixed top-0 left-0 z-30 bg-gradient-to-b from-blue-50 to-white dark:from-slate-800 dark:to-slate-900 dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-60'}`}>
      <div className={`flex items-center justify-between ${isCollapsed ? 'px-3 py-4' : 'px-4 py-6'} border-b border-gray-200 dark:border-slate-700`}>
        {!isCollapsed && <div className="text-lg font-bold text-blue-700 dark:text-blue-300">Settings</div>}
        <button
          onClick={toggleCollapsed}
          className={`p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-300 dark:hover:text-blue-200 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 ${isCollapsed ? 'mx-auto' : ''}`}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <FaBars className="w-4 h-4" /> : <FaTimes className="w-4 h-4" />}
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto py-4 custom-scrollbar">
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
                const active = pathname === s.href;
                return (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      className={`flex items-center rounded-lg transition-all duration-200 font-medium text-sm group relative
                        ${active 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 shadow-sm' 
                          : 'text-gray-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-700 dark:hover:text-blue-300'
                        }
                        ${isCollapsed 
                          ? 'justify-center py-2.5 px-2 mx-2' 
                          : 'py-2.5 px-4'
                        }
                      `}
                      title={isCollapsed ? s.label : undefined}
                    >
                      <s.icon className={`${iconClass} flex-shrink-0 transition-colors ${active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-300'}`} />
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
