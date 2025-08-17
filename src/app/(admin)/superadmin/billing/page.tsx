'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/utils/api';
import { 
  FaDollarSign, 
  FaUsers, 
  FaCalendarAlt,
  FaExchangeAlt,
  FaCog,
  FaSync
} from 'react-icons/fa';

// Types
interface BillingMetrics {
  mrr: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  delinquentRate: number;
}

// Main Component
export default function SuperAdminBillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null);

  // Fetch billing data on component mount
  useEffect(() => {
    fetchBillingData();
  }, []);

  // Fetch billing metrics from API
  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiGet('/admin/billing/metrics');
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage subscriptions, view transactions, and configure payment settings
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          icon={<FaDollarSign className="h-6 w-6" />}
          title="Monthly Revenue"
          value={formatCurrency(metrics?.mrr || 0)}
          color="blue"
        />
        <MetricCard 
          icon={<FaUsers className="h-6 w-6" />}
          title="Active Subscriptions"
          value={metrics?.activeSubscriptions || 0}
          color="green"
        />
        <MetricCard 
          icon={<FaCalendarAlt className="h-6 w-6" />}
          title="Trials"
          value={metrics?.trialSubscriptions || 0}
          color="yellow"
        />
        <MetricCard 
          icon={<FaExchangeAlt className="h-6 w-6" />}
          title="Delinquency"
          value={`${metrics?.delinquentRate || 0}%`}
          color="red"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
            <button 
              onClick={fetchBillingData}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FaSync className="-ml-0.5 mr-2 h-4 w-4 text-gray-500" />
              Refresh
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionCard 
              title="Manage Tenants"
              description="View and manage all tenant subscriptions"
              icon={<FaUsers className="h-5 w-5" />}
              onClick={() => router.push('/superadmin/billing/tenants')}
            />
            <ActionCard 
              title="Billing Settings"
              description="Configure payment providers and settings"
              icon={<FaCog className="h-5 w-5" />}
              onClick={() => router.push('/superadmin/billing/settings')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function MetricCard({ icon, title, value, color }: { 
  icon: React.ReactNode; 
  title: string; 
  value: string | number;
  color: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colorMap = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' }
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md p-3 ${colorMap[color].bg} ${colorMap[color].text}`}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ 
  title, 
  description, 
  icon, 
  onClick 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div 
      onClick={onClick}
      className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 cursor-pointer transition-colors"
    >
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center text-gray-600">
          {icon}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="focus:outline-none">
          <span className="absolute inset-0" aria-hidden="true" />
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-500 truncate">{description}</p>
        </div>
      </div>
    </div>
  );
}