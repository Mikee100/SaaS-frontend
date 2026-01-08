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
  FaPlug,
  FaUserShield,
  FaChartLine,
  FaArrowRight
} from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';

interface Tenant {
  name: string;
  email: string;
}

export default function SettingsPage() {
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

  const settingsCategories = [
    {
      title: 'Organization',
      items: [
        { 
          href: '/settings/business-info', 
          label: 'Business Info', 
          icon: FaBuilding, 
          description: 'Update your organization details',
          color: 'blue'
        },
        { 
          href: '/settings/users', 
          label: 'Users', 
          icon: FaUsers, 
          description: 'Manage team members',
          color: 'green'
        },
        { 
          href: '/settings/branches', 
          label: 'Branches', 
          icon: FaBuilding, 
          description: 'Manage your branches',
          color: 'indigo'
        },
        { 
          href: '/settings/permissions', 
          label: 'Permissions', 
          icon: FaUserShield, 
          description: 'Configure access controls',
          color: 'purple'
        },
        { 
          href: '/settings/billing', 
          label: 'Billing & Subscription', 
          icon: FaCreditCard, 
          description: 'Manage your plan and payments',
          color: 'amber'
        },
        { 
          href: '/settings/notifications', 
          label: 'Notifications', 
          icon: FaBell, 
          description: 'Configure notification preferences',
          color: 'orange'
        },
        { 
          href: '/settings/integrations', 
          label: 'Integrations', 
          icon: FaPlug, 
          description: 'Connect with third-party services',
          color: 'pink'
        },
        { 
          href: '/settings/logo', 
          label: 'Logo & Branding', 
          icon: FaImage, 
          description: 'Customize your branding',
          color: 'teal'
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
          color: 'gray'
        },
        { 
          href: '/settings/password', 
          label: 'Password', 
          icon: FaKey, 
          description: 'Change your password',
          color: 'red'
        },
        { 
          href: '/settings/security', 
          label: 'Security', 
          icon: FaShieldAlt, 
          description: 'Security and privacy settings',
          color: 'blue'
        },
      ]
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
    green: 'bg-green-100 text-green-600 hover:bg-green-200',
    indigo: 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200',
    purple: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
    amber: 'bg-amber-100 text-amber-600 hover:bg-amber-200',
    orange: 'bg-orange-100 text-orange-600 hover:bg-orange-200',
    pink: 'bg-pink-100 text-pink-600 hover:bg-pink-200',
    teal: 'bg-teal-100 text-teal-600 hover:bg-teal-200',
    gray: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    red: 'bg-red-100 text-red-600 hover:bg-red-200',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600 text-lg">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600 text-lg">
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
        {settingsCategories.map((category) => (
          <div key={category.title}>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{category.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-200 flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl ${colorClasses[item.color as keyof typeof colorClasses]}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <FaArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-sm text-gray-600 flex-1">
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
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/settings/audit-logs"
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                <FaChartLine className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">Audit Logs</h3>
                <p className="text-sm text-gray-500">View activity history</p>
              </div>
            </div>
            <FaArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </Link>
          <Link
            href="/settings/contact"
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                <FaBuilding className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">Contact Admin</h3>
                <p className="text-sm text-gray-500">Get help and support</p>
              </div>
            </div>
            <FaArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
}