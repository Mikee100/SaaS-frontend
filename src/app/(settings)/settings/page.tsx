"use client";
import UsageDashboard from '@/components/UsageDashboard';
import Link from 'next/link';
import { 
  FaBuilding, 
  FaUsers, 
  FaCreditCard, 
  FaBell, 
  FaCogs, 
  FaKey, 
  FaShieldAlt,
  FaImage,
  FaFileAlt,
  FaPlug,
  FaUserShield,
  FaChartLine,
  FaArrowRight
} from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import { useUser } from '@/components/UserContext';
import { useRouter } from 'next/navigation';

interface Tenant {
  name: string;
  email: string;
}

export default function SettingsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const tenantData = await apiGet<Tenant>('/tenant/me');
        setTenant(tenantData);
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (!user) return null;

  const hasSettingsPermission = user.isSuperadmin || user.roles?.includes('owner') || user.roles?.includes('admin') || user.permissions?.includes('view_settings');

  if (!hasSettingsPermission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <FaShieldAlt className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 max-w-md">
          You don't have permission to access the Settings. Please contact your administrator.
        </p>
      </div>
    );
  }

  const settingsCategories = [
    {
      title: 'Organization',
      items: [
        { 
          href: '/settings/business-info', 
          label: 'Business Info', 
          icon: FaBuilding, 
          description: 'Update your organization details',
          permission: 'view_settings'
        },
        { 
          href: '/settings/users', 
          label: 'Users', 
          icon: FaUsers, 
          description: 'Manage team members',
          permission: 'view_users'
        },
        { 
          href: '/settings/branches', 
          label: 'Branches', 
          icon: FaBuilding, 
          description: 'Manage your branches',
          permission: 'view_branches'
        },
        { 
          href: '/settings/permissions', 
          label: 'Permissions', 
          icon: FaUserShield, 
          description: 'Configure access controls',
          permission: 'view_roles'
        },
        { 
          href: '/settings/billing', 
          label: 'Billing & Subscription', 
          icon: FaCreditCard, 
          description: 'Manage your plan and payments',
          permission: 'view_billing'
        },
        { 
          href: '/settings/notifications', 
          label: 'Notifications', 
          icon: FaBell, 
          description: 'Configure notification preferences',
        },
        { 
          href: '/settings/integrations', 
          label: 'Integrations', 
          icon: FaPlug, 
          description: 'Connect with third-party services',
          permission: 'view_settings'
        },
        {
          href: '/settings/modules',
          label: 'Modules',
          icon: FaCogs,
          description: 'Enable or disable modules for this tenant',
          permission: 'view_settings'
        },
        { 
          href: '/settings/logo', 
          label: 'Logo & Branding', 
          icon: FaImage, 
          description: 'Customize your branding',
          permission: 'view_settings'
        },
        {
          href: '/settings/pos-display-name',
          label: 'POS Display Name',
          icon: FaFileAlt,
          description: 'Set the business name shown on POS screens',
          permission: 'view_settings'
        },
        { 
          href: '/settings/pdf-templates', 
          label: 'Report / PDF Design', 
          icon: FaFileAlt, 
          description: 'Design how your reports, invoices, and receipts look',
          permission: 'view_settings'
        },
      ]
    },
    {
      title: 'Account',
      items: [
        { 
          href: '/settings/preferences', 
          label: 'Preferences', 
          icon: FaCogs, 
          description: 'Personalize your experience',
        },
        { 
          href: '/settings/password', 
          label: 'Password', 
          icon: FaKey, 
          description: 'Change your password',
        },
        { 
          href: '/settings/security', 
          label: 'Security', 
          icon: FaShieldAlt, 
          description: 'Security and privacy settings',
        },
      ]
    }
  ];

  const filteredCategories = settingsCategories.map(category => ({
    ...category,
    items: category.items.filter(item => {
      if (!item.permission) return true;
      return user.isSuperadmin || user.roles?.includes('owner') || user.roles?.includes('admin') || user.permissions?.includes(item.permission);
    })
  })).filter(cat => cat.items.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent dark:border-blue-400 mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400 text-lg">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-slate-400 text-lg">
            {tenant?.name 
              ? `Manage settings for ${tenant.name}` 
              : 'Manage your account, preferences, and organization settings'
            }
          </p>
        </div>
      </div>

      {/* Usage Dashboard */}
      <div className="mb-8">
        <UsageDashboard />
      </div>

      {/* Settings Categories */}
      <div className="space-y-8">
        {filteredCategories.map((category) => (
          <div key={category.title}>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-4">{category.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex flex-col rounded-xl border border-gray-200 bg-white p-6 transition-colors duration-200 hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="rounded-lg bg-gray-100 p-3 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
                        <Icon className="h-6 w-6" />
                      </div>
                      <FaArrowRight className="h-5 w-5 text-gray-400 transition-all group-hover:translate-x-1 group-hover:text-indigo-600 dark:text-zinc-500 dark:group-hover:text-indigo-300" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900 transition-colors group-hover:text-indigo-700 dark:text-zinc-100 dark:group-hover:text-indigo-300">
                      {item.label}
                    </h3>
                    <p className="flex-1 text-sm text-gray-600 dark:text-zinc-400">
                      {item.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(user.isSuperadmin || user.roles?.includes('owner') || user.roles?.includes('admin') || user.permissions?.includes('view_audit_log')) && (
            <Link
              href="/settings/audit-logs"
              className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gray-100 p-2 transition-colors group-hover:bg-indigo-50 dark:bg-zinc-800 dark:group-hover:bg-indigo-950/40">
                  <FaChartLine className="h-5 w-5 text-gray-600 group-hover:text-indigo-600 dark:text-zinc-400 dark:group-hover:text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700 dark:text-zinc-100 dark:group-hover:text-indigo-300">Audit Logs</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400">View activity history</p>
                </div>
              </div>
              <FaArrowRight className="h-4 w-4 text-gray-400 transition-all group-hover:translate-x-1 group-hover:text-indigo-600 dark:text-zinc-500 dark:group-hover:text-indigo-300" />
            </Link>
          )}
          <Link
            href="/settings/contact"
            className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-2 transition-colors group-hover:bg-indigo-50 dark:bg-zinc-800 dark:group-hover:bg-indigo-950/40">
                <FaBuilding className="h-5 w-5 text-gray-600 group-hover:text-indigo-600 dark:text-zinc-400 dark:group-hover:text-indigo-300" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700 dark:text-zinc-100 dark:group-hover:text-indigo-300">Contact Admin</h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400">Get help and support</p>
              </div>
            </div>
            <FaArrowRight className="h-4 w-4 text-gray-400 transition-all group-hover:translate-x-1 group-hover:text-indigo-600 dark:text-zinc-500 dark:group-hover:text-indigo-300" />
          </Link>
        </div>
      </div>
    </div>
  );
}