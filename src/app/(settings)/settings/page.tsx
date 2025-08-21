"use client";
import PlanGuard from '@/components/PlanGuard';
import UsageDashboard from '@/components/UsageDashboard';
import { FaCog, FaUsers, FaChartLine, FaCrown, FaDownload, FaShare } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '@/utils/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: { name: string };
}

interface Tenant {
  name: string;
  email: string;
  phone: string;
}

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tenantData, usersData] = await Promise.all([
          apiGet('/tenant/me'),
          apiGet('/user')
        ]);
        setTenant(tenantData);
        setUsers(usersData);
      } catch (err) {
        setError('Failed to load settings data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);
    setError(null);
    try {
      await apiPut('/tenant/me', tenant);
    } catch (err) {
      setError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  {/* Main Settings */}
  <div className="lg:col-span-2 space-y-6">
          {/* Basic Settings - Available to all */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-6">
              <FaCog className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">Basic Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={tenant?.name || ''}
                  onChange={(e) => setTenant(t => t ? { ...t, name: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={tenant?.email || ''}
                  onChange={(e) => setTenant(t => t ? { ...t, email: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={tenant?.phone || ''}
                  onChange={(e) => setTenant(t => t ? { ...t, phone: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="mt-6">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* User Management - Basic Plan */}
          <PlanGuard requiredPlan="Basic">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-6">
                <FaUsers className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  Basic+
                </span>
              </div>
              
              <div className="space-y-4">
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {user.role?.name || 'User'}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Add User
                </button>
              </div>
            </div>
          </PlanGuard>

          {/* Advanced Analytics - Pro Plan */}
          <PlanGuard requiredPlan="Pro">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-6">
                <FaChartLine className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-800">Advanced Analytics</h2>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                  Pro Feature
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-medium text-purple-800 mb-2">Custom Reports</h3>
                    <p className="text-sm text-purple-600">Generate detailed reports with custom filters</p>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-medium text-purple-800 mb-2">Data Export</h3>
                    <p className="text-sm text-purple-600">Export your data in multiple formats</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  <FaDownload className="w-4 h-4" />
                  Export Data
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors">
                  <FaShare className="w-4 h-4" />
                  Share Reports
                </button>
              </div>
            </div>
          </PlanGuard>

          {/* Enterprise Features */}
          <PlanGuard requiredPlan="Enterprise">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-6">
                <FaCrown className="w-6 h-6 text-yellow-600" />
                <h2 className="text-xl font-semibold text-gray-800">Enterprise Features</h2>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                  Enterprise
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h3 className="font-medium text-yellow-800 mb-2">API Access</h3>
                    <p className="text-sm text-yellow-600">Full API access for integrations</p>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h3 className="font-medium text-yellow-800 mb-2">Custom Branding</h3>
                    <p className="text-sm text-yellow-600">White-label your experience</p>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h3 className="font-medium text-yellow-800 mb-2">Priority Support</h3>
                    <p className="text-sm text-yellow-600">24/7 dedicated support</p>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h3 className="font-medium text-yellow-800 mb-2">Advanced Security</h3>
                    <p className="text-sm text-yellow-600">Enhanced security features</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                  Configure Enterprise Features
                </button>
              </div>
            </div>
          </PlanGuard>
        </div>

  {/* Sidebar */}
  <div className="space-y-6 overflow-y-auto max-h-[80vh] pr-2">
          <UsageDashboard />
          
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <a
                href="/settings/billing"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <FaCog className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Billing & Plans</span>
              </a>
              
              <PlanGuard requiredPlan="Basic" showUpgradePrompt={false}>
                <a
                  href="/settings/users"
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <FaUsers className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">User Management</span>
                </a>
              </PlanGuard>
              
              <PlanGuard requiredPlan="Pro" showUpgradePrompt={false}>
                <a
                  href="/settings/analytics"
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <FaChartLine className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Analytics Settings</span>
                </a>
              </PlanGuard>
              <a
                href="/settings/branches"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <FaCog className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">Branches</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 