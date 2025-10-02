"use client";
import PlanGuard from '@/components/PlanGuard';
import UsageDashboard from '@/components/UsageDashboard';
import { FaCog, FaUsers, FaChartLine, FaCrown, FaDownload, FaShare, FaSearch, FaBell, FaShieldAlt, FaPlug, FaTrash, FaPlus, FaEnvelope } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { apiGet, apiPut, apiPost, apiDelete } from '@/utils/api';

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
  notifications?: {
    emailAlerts: boolean;
    smsAlerts: boolean;
    inApp: boolean;
  };
  analytics?: {
    reportScheduling: boolean;
    emailReports: boolean;
  };
  enterprise?: {
    apiAccess: boolean;
    customBranding: boolean;
  };
}

interface NotificationPrefs {
  emailAlerts: boolean;
  smsAlerts: boolean;
  inApp: boolean;
}

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    emailAlerts: true,
    smsAlerts: false,
    inApp: true,
  });
  const [analyticsPrefs, setAnalyticsPrefs] = useState({
    reportScheduling: false,
    emailReports: false,
  });
  const [enterprisePrefs, setEnterprisePrefs] = useState({
    apiAccess: false,
    customBranding: false,
  });

  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tenantData, usersData] = await Promise.all([
          apiGet<Tenant>('/tenant/me'),
          apiGet<User[]>('/user')
        ]);
        setTenant(tenantData);
        setUsers(usersData);
        setFilteredUsers(usersData);
        if (tenantData.notifications) setNotificationPrefs(tenantData.notifications);
        if (tenantData.analytics) setAnalyticsPrefs(tenantData.analytics);
        if (tenantData.enterprise) setEnterprisePrefs(tenantData.enterprise);
      } catch {
        setError('Failed to load settings data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const handleSaveBasic = async () => {
    if (!tenant) return;
    if (!tenant.email || !/^\S+@\S+\.\S+$/.test(tenant.email)) {
      setError('Invalid email format.');
      return;
    }
    if (tenant.phone && !/^\+?[\d\s-()]{10,}$/.test(tenant.phone)) {
      setError('Invalid phone format.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiPut('/tenant/me', tenant);
      // Auto-save other prefs
      await Promise.all([
        apiPut('/tenant/notifications', notificationPrefs),
        apiPut('/tenant/analytics', analyticsPrefs),
        apiPut('/tenant/enterprise', enterprisePrefs),
      ]);
    } catch {
      setError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleUserRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiPut(`/user/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: { name: newRole } } : u));
    } catch {
      setError('Failed to update user role.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiDelete(`/user/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
    } catch {
      setError('Failed to delete user.');
    }
  };

  const handleAddUser = async () => {
    // Placeholder for add user modal/form
    const email = prompt('Enter user email to invite:');
    if (email) {
      try {
        await apiPost('/user/invite', { email });
        // Refresh users
        const usersData = await apiGet<User[]>('/user');
        setUsers(usersData);
      } catch {
        setError('Failed to invite user.');
      }
    }
  };

  const handleNotificationChange = (key: keyof NotificationPrefs, value: boolean) => {
    setNotificationPrefs(prev => ({ ...prev, [key]: value }));
  };

  const handleAnalyticsChange = (key: keyof typeof analyticsPrefs, value: boolean) => {
    setAnalyticsPrefs(prev => ({ ...prev, [key]: value }));
  };

  const handleEnterpriseChange = (key: keyof typeof enterprisePrefs, value: boolean) => {
    setEnterprisePrefs(prev => ({ ...prev, [key]: value }));
    if (key === 'apiAccess' && value) {
      // Generate API key placeholder
      alert('API key generated - check your integrations page.');
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Settings', icon: <FaCog />, plan: undefined },
    { id: 'users', label: 'Users', icon: <FaUsers />, plan: 'Basic' as const },
    { id: 'analytics', label: 'Analytics', icon: <FaChartLine />, plan: 'Pro' as const },
    { id: 'enterprise', label: 'Enterprise', icon: <FaCrown />, plan: 'Enterprise' as const },
    { id: 'notifications', label: 'Notifications', icon: <FaBell />, plan: 'Basic' as const },
  ];

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
        <div className="mt-4 relative">
          <FaSearch className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8 border-b border-gray-200">
          {tabs.map((tab) => (
            <PlanGuard key={tab.id} requiredPlan={tab.plan}>
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            </PlanGuard>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'basic' && (
            <>
              {/* Basic Settings */}
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
                    onClick={handleSaveBasic}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <PlanGuard requiredPlan="Basic">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-6">
                  <FaUsers className="w-6 h-6 text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Basic+</span>
                </div>

                <div className="space-y-4 mb-4">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={user.role?.name || 'User'}
                          onChange={(e) => handleUserRoleChange(user.id, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="User">User</option>
                          <option value="Admin">Admin</option>
                          <option value="Owner">Owner</option>
                        </select>
                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800">
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <button onClick={handleAddUser} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <FaPlus className="inline mr-2" /> Add User
                  </button>
                </div>
              </div>
            </PlanGuard>
          )}

          {activeTab === 'analytics' && (
            <PlanGuard requiredPlan="Pro">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-6">
                  <FaChartLine className="w-6 h-6 text-purple-600" />
                  <h2 className="text-xl font-semibold text-gray-800">Advanced Analytics</h2>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">Pro Feature</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="reportScheduling"
                      checked={analyticsPrefs.reportScheduling}
                      onChange={(e) => handleAnalyticsChange('reportScheduling', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="reportScheduling" className="flex-1 cursor-pointer">
                      <h3 className="font-medium text-purple-800">Enable Report Scheduling</h3>
                      <p className="text-sm text-purple-600">Schedule automated reports</p>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="emailReports"
                      checked={analyticsPrefs.emailReports}
                      onChange={(e) => handleAnalyticsChange('emailReports', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="emailReports" className="flex-1 cursor-pointer">
                      <h3 className="font-medium text-purple-800">Email Reports</h3>
                      <p className="text-sm text-purple-600">Receive reports via email</p>
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    <FaDownload className="w-4 h-4" /> Export Data
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors">
                    <FaShare className="w-4 h-4" /> Share Reports
                  </button>
                </div>
              </div>
            </PlanGuard>
          )}

          {activeTab === 'enterprise' && (
            <PlanGuard requiredPlan="Enterprise">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-6">
                  <FaCrown className="w-6 h-6 text-yellow-600" />
                  <h2 className="text-xl font-semibold text-gray-800">Enterprise Features</h2>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Enterprise</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="apiAccess"
                      checked={enterprisePrefs.apiAccess}
                      onChange={(e) => handleEnterpriseChange('apiAccess', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="apiAccess" className="flex-1 cursor-pointer">
                      <h3 className="font-medium text-yellow-800">API Access</h3>
                      <p className="text-sm text-yellow-600">Full API access for integrations</p>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="customBranding"
                      checked={enterprisePrefs.customBranding}
                      onChange={(e) => handleEnterpriseChange('customBranding', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="customBranding" className="flex-1 cursor-pointer">
                      <h3 className="font-medium text-yellow-800">Custom Branding</h3>
                      <p className="text-sm text-yellow-600">White-label your experience</p>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
          )}

          {activeTab === 'notifications' && (
            <PlanGuard requiredPlan="Basic">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-6">
                  <FaBell className="w-6 h-6 text-orange-600" />
                  <h2 className="text-xl font-semibold text-gray-800">Notification Preferences</h2>
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">Basic+</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="emailAlerts"
                      checked={notificationPrefs.emailAlerts}
                      onChange={(e) => handleNotificationChange('emailAlerts', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="emailAlerts" className="flex-1 cursor-pointer">
                      <h3 className="font-medium text-orange-800">Email Alerts</h3>
                      <p className="text-sm text-orange-600">Receive notifications via email</p>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="smsAlerts"
                      checked={notificationPrefs.smsAlerts}
                      onChange={(e) => handleNotificationChange('smsAlerts', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="smsAlerts" className="flex-1 cursor-pointer">
                      <h3 className="font-medium text-orange-800">SMS Alerts</h3>
                      <p className="text-sm text-orange-600">Receive SMS notifications (Pro+)</p>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="inApp"
                      checked={notificationPrefs.inApp}
                      onChange={(e) => handleNotificationChange('inApp', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="inApp" className="flex-1 cursor-pointer">
                      <h3 className="font-medium text-orange-800">In-App Notifications</h3>
                      <p className="text-sm text-orange-600">See notifications in the dashboard</p>
                    </label>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handleSaveBasic}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Save Notification Settings
                  </button>
                </div>
              </div>
            </PlanGuard>
          )}


        </div>

        {/* Sidebar */}
        <div className="space-y-6 overflow-y-auto max-h-[80vh] pr-2">
          <UsageDashboard />

          {/* Quick Actions - Filtered */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {[
                { href: "/settings/billing", label: "Billing & Plans", icon: <FaCog className="w-4 h-4 text-blue-600" />, plan: undefined },
                { href: "/settings/users", label: "User Management", icon: <FaUsers className="w-4 h-4 text-green-600" />, plan: "Basic" as const },
                { href: "/settings/analytics", label: "Analytics Settings", icon: <FaChartLine className="w-4 h-4 text-purple-600" />, plan: "Pro" as const },
                { href: "/settings/branches", label: "Branches", icon: <FaCog className="w-4 h-4 text-yellow-600" />, plan: undefined },
                { href: "/settings/notifications", label: "Notifications", icon: <FaBell className="w-4 h-4 text-orange-600" />, plan: "Basic" as const },
                { href: "/settings/integrations", label: "Integrations", icon: <FaPlug className="w-4 h-4 text-indigo-600" />, plan: "Pro" as const },
                { href: "/settings/security", label: "Security", icon: <FaShieldAlt className="w-4 h-4 text-red-600" />, plan: "Enterprise" as const },
                { href: "/settings/contact", label: "Contact Admin", icon: <FaEnvelope className="w-4 h-4 text-blue-600" />, plan: undefined },
              ].filter(action =>
                !searchQuery || action.label.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((action, index) => (
                <PlanGuard key={index} requiredPlan={action.plan} showUpgradePrompt={false}>
                  <a
                    href={action.href}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {action.icon}
                    <span className="text-sm font-medium text-gray-700">{action.label}</span>
                  </a>
                </PlanGuard>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
