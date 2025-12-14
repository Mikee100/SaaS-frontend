"use client";
import PlanGuard from '@/components/PlanGuard';
import UsageDashboard from '@/components/UsageDashboard';
import { FaCog, FaUsers, FaChartLine, FaCrown, FaDownload, FaShare, FaSearch, FaBell, FaShieldAlt, FaPlug, FaTrash, FaPlus, FaEnvelope, FaCheck, FaSave, FaEdit, FaTimes } from 'react-icons/fa';
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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600 text-lg">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-2xl mx-auto mt-8">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <FaTimes className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-800 mb-1">Error Loading Settings</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600 text-lg">Manage your account, preferences, and organization settings</p>
          </div>
        </div>
      </div>

      {/* Usage Dashboard - Compact Version */}
      <div className="mb-8">
        <UsageDashboard />
      </div>

      {/* Tabs Navigation - Modern Design */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <nav className="flex flex-wrap gap-1 p-2 bg-gray-50/50">
            {tabs.map((tab) => (
              <PlanGuard key={tab.id} requiredPlan={tab.plan}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <span className={`${activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'}`}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-blue-600 rounded-full"></div>
                  )}
                </button>
              </PlanGuard>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="space-y-6">

        {/* Settings Sections */}
        {/* Basic Settings */}
        {activeTab === 'basic' && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-8">
              {/* Section Header */}
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-200">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FaCog className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Basic Settings</h2>
                  <p className="text-gray-500 text-sm mt-1">Update your organization's basic information</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Business Name
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={tenant?.name || ''}
                      onChange={(e) => setTenant(t => t ? { ...t, name: e.target.value } : null)}
                      placeholder="Enter business name"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-400"
                    />
                    <p className="text-xs text-gray-500">The name of your organization</p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Email Address
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="email"
                      value={tenant?.email || ''}
                      onChange={(e) => setTenant(t => t ? { ...t, email: e.target.value } : null)}
                      placeholder="business@example.com"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-400"
                    />
                    <p className="text-xs text-gray-500">Primary contact email</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={tenant?.phone || ''}
                    onChange={(e) => setTenant(t => t ? { ...t, phone: e.target.value } : null)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500">Contact phone number (optional)</p>
                </div>
              </div>

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {error && <span className="text-red-600">{error}</span>}
                </div>
                <button
                  onClick={handleSaveBasic}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:bg-blue-300 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <PlanGuard requiredPlan="Basic">
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-8">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <FaUsers className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                      <p className="text-gray-500 text-sm mt-1">Manage team members and their roles</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Basic+</span>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white text-gray-900 placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Users List */}
                <div className="space-y-3 mb-6 max-h-96 overflow-y-auto pr-2">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FaUsers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No users found</p>
                      <p className="text-sm">Try adjusting your search query</p>
                    </div>
                  ) : (
                    filteredUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all group">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={user.role?.name || 'User'}
                            onChange={(e) => handleUserRoleChange(user.id, e.target.value)}
                            className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white text-sm font-medium text-gray-700 cursor-pointer"
                          >
                            <option value="User">User</option>
                            <option value="Admin">Admin</option>
                            <option value="Owner">Owner</option>
                          </select>
                          <button 
                            onClick={() => handleDeleteUser(user.id)} 
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Delete user"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add User Button */}
                <div className="pt-6 border-t border-gray-200">
                  <button 
                    onClick={handleAddUser} 
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <FaPlus className="w-4 h-4" />
                    Invite New User
                  </button>
                </div>
              </div>
            </section>
          </PlanGuard>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <PlanGuard requiredPlan="Pro">
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-8">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <FaChartLine className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Advanced Analytics</h2>
                      <p className="text-gray-500 text-sm mt-1">Configure analytics and reporting preferences</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">Pro Feature</span>
                </div>

                {/* Settings Options */}
                <div className="space-y-4 mb-8">
                  <label className="flex items-start gap-4 p-5 bg-gradient-to-r from-purple-50 to-purple-50/50 rounded-xl border-2 border-purple-100 hover:border-purple-200 cursor-pointer transition-all group">
                    <div className="relative flex-shrink-0 mt-1">
                      <input
                        type="checkbox"
                        id="reportScheduling"
                        checked={analyticsPrefs.reportScheduling}
                        onChange={(e) => handleAnalyticsChange('reportScheduling', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        analyticsPrefs.reportScheduling 
                          ? 'bg-purple-600 border-purple-600' 
                          : 'bg-white border-gray-300 group-hover:border-purple-400'
                      }`}>
                        {analyticsPrefs.reportScheduling && (
                          <FaCheck className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Enable Report Scheduling</h3>
                      <p className="text-sm text-gray-600">Automatically schedule and generate reports at specified intervals</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-4 p-5 bg-gradient-to-r from-purple-50 to-purple-50/50 rounded-xl border-2 border-purple-100 hover:border-purple-200 cursor-pointer transition-all group">
                    <div className="relative flex-shrink-0 mt-1">
                      <input
                        type="checkbox"
                        id="emailReports"
                        checked={analyticsPrefs.emailReports}
                        onChange={(e) => handleAnalyticsChange('emailReports', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        analyticsPrefs.emailReports 
                          ? 'bg-purple-600 border-purple-600' 
                          : 'bg-white border-gray-300 group-hover:border-purple-400'
                      }`}>
                        {analyticsPrefs.emailReports && (
                          <FaCheck className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Email Reports</h3>
                      <p className="text-sm text-gray-600">Receive automated analytics reports directly in your inbox</p>
                    </div>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="pt-6 border-t border-gray-200 flex flex-wrap gap-3">
                  <button className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                    <FaDownload className="w-4 h-4" />
                    Export Data
                  </button>
                  <button className="flex items-center gap-2 px-6 py-3 border-2 border-purple-300 text-purple-700 rounded-xl hover:bg-purple-50 transition-all font-semibold">
                    <FaShare className="w-4 h-4" />
                    Share Reports
                  </button>
                </div>
              </div>
            </section>
          </PlanGuard>
        )}

        {/* Enterprise Tab */}
        {activeTab === 'enterprise' && (
          <PlanGuard requiredPlan="Enterprise">
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-8">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl">
                      <FaCrown className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Enterprise Features</h2>
                      <p className="text-gray-500 text-sm mt-1">Unlock powerful enterprise capabilities</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 rounded-full text-xs font-semibold">Enterprise</span>
                </div>

                {/* Enterprise Options */}
                <div className="space-y-4 mb-8">
                  <label className="flex items-start gap-4 p-5 bg-gradient-to-r from-yellow-50 to-yellow-50/50 rounded-xl border-2 border-yellow-100 hover:border-yellow-200 cursor-pointer transition-all group">
                    <div className="relative flex-shrink-0 mt-1">
                      <input
                        type="checkbox"
                        id="apiAccess"
                        checked={enterprisePrefs.apiAccess}
                        onChange={(e) => handleEnterpriseChange('apiAccess', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        enterprisePrefs.apiAccess 
                          ? 'bg-yellow-600 border-yellow-600' 
                          : 'bg-white border-gray-300 group-hover:border-yellow-400'
                      }`}>
                        {enterprisePrefs.apiAccess && (
                          <FaCheck className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">API Access</h3>
                      <p className="text-sm text-gray-600">Full REST API access for custom integrations and automation</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-4 p-5 bg-gradient-to-r from-yellow-50 to-yellow-50/50 rounded-xl border-2 border-yellow-100 hover:border-yellow-200 cursor-pointer transition-all group">
                    <div className="relative flex-shrink-0 mt-1">
                      <input
                        type="checkbox"
                        id="customBranding"
                        checked={enterprisePrefs.customBranding}
                        onChange={(e) => handleEnterpriseChange('customBranding', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        enterprisePrefs.customBranding 
                          ? 'bg-yellow-600 border-yellow-600' 
                          : 'bg-white border-gray-300 group-hover:border-yellow-400'
                      }`}>
                        {enterprisePrefs.customBranding && (
                          <FaCheck className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Custom Branding</h3>
                      <p className="text-sm text-gray-600">White-label your experience with custom logos and branding</p>
                    </div>
                  </label>
                </div>

                {/* Enterprise Benefits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="p-5 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-yellow-200 rounded-lg">
                        <FaShieldAlt className="w-5 h-5 text-yellow-700" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Priority Support</h3>
                    </div>
                    <p className="text-sm text-gray-600">24/7 dedicated support with guaranteed response times</p>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-yellow-200 rounded-lg">
                        <FaShieldAlt className="w-5 h-5 text-yellow-700" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Advanced Security</h3>
                    </div>
                    <p className="text-sm text-gray-600">Enhanced security features including SSO and advanced encryption</p>
                  </div>
                </div>

                {/* Configure Button */}
                <div className="pt-6 border-t border-gray-200">
                  <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                    <FaCog className="w-4 h-4" />
                    Configure Enterprise Features
                  </button>
                </div>
              </div>
            </section>
          </PlanGuard>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <PlanGuard requiredPlan="Basic">
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-8">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <FaBell className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
                      <p className="text-gray-500 text-sm mt-1">Choose how you want to receive notifications</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">Basic+</span>
                </div>

                {/* Notification Options */}
                <div className="space-y-4 mb-8">
                  <label className="flex items-start gap-4 p-5 bg-gradient-to-r from-orange-50 to-orange-50/50 rounded-xl border-2 border-orange-100 hover:border-orange-200 cursor-pointer transition-all group">
                    <div className="relative flex-shrink-0 mt-1">
                      <input
                        type="checkbox"
                        id="emailAlerts"
                        checked={notificationPrefs.emailAlerts}
                        onChange={(e) => handleNotificationChange('emailAlerts', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        notificationPrefs.emailAlerts 
                          ? 'bg-orange-600 border-orange-600' 
                          : 'bg-white border-gray-300 group-hover:border-orange-400'
                      }`}>
                        {notificationPrefs.emailAlerts && (
                          <FaCheck className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Email Alerts</h3>
                      <p className="text-sm text-gray-600">Receive important notifications and updates via email</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-4 p-5 bg-gradient-to-r from-orange-50 to-orange-50/50 rounded-xl border-2 border-orange-100 hover:border-orange-200 cursor-pointer transition-all group">
                    <div className="relative flex-shrink-0 mt-1">
                      <input
                        type="checkbox"
                        id="smsAlerts"
                        checked={notificationPrefs.smsAlerts}
                        onChange={(e) => handleNotificationChange('smsAlerts', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        notificationPrefs.smsAlerts 
                          ? 'bg-orange-600 border-orange-600' 
                          : 'bg-white border-gray-300 group-hover:border-orange-400'
                      }`}>
                        {notificationPrefs.smsAlerts && (
                          <FaCheck className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">SMS Alerts</h3>
                      <p className="text-sm text-gray-600">Get instant SMS notifications for critical updates (Pro+)</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-4 p-5 bg-gradient-to-r from-orange-50 to-orange-50/50 rounded-xl border-2 border-orange-100 hover:border-orange-200 cursor-pointer transition-all group">
                    <div className="relative flex-shrink-0 mt-1">
                      <input
                        type="checkbox"
                        id="inApp"
                        checked={notificationPrefs.inApp}
                        onChange={(e) => handleNotificationChange('inApp', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        notificationPrefs.inApp 
                          ? 'bg-orange-600 border-orange-600' 
                          : 'bg-white border-gray-300 group-hover:border-orange-400'
                      }`}>
                        {notificationPrefs.inApp && (
                          <FaCheck className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">In-App Notifications</h3>
                      <p className="text-sm text-gray-600">See notifications and alerts directly in your dashboard</p>
                    </div>
                  </label>
                </div>

                {/* Save Button */}
                <div className="pt-6 border-t border-gray-200 flex items-center justify-end">
                  <button
                    onClick={handleSaveBasic}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <FaSave className="w-4 h-4" />
                    Save Notification Settings
                  </button>
                </div>
              </div>
            </section>
          </PlanGuard>
        )}
      </main>
    </div>
  );
}