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
  FaSync,
  FaShieldAlt,
} from 'react-icons/fa';

// Types
interface BillingMetrics {
  mrr: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  delinquentRate: number;
}

interface Subscription {
  id: string;
  clientName?: string;
  tenantName?: string;
  clientEmail?: string;
  email?: string;
  plan?: {
    name: string;
    price: number;
  };
  status: string;
  startDate: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface ReconciliationSummary {
  unappliedManualPayments: number;
  failedReceiptUploads: number;
  invoicePaymentMismatches: number;
  overdueTenants: number;
}

interface ReconciliationDashboard {
  generatedAt: string;
  summary: ReconciliationSummary;
}

// Main Component
export default function SuperAdminBillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [subsError, setSubsError] = useState('');
  const [reconciliationSummary, setReconciliationSummary] =
    useState<ReconciliationSummary | null>(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [reconError, setReconError] = useState('');

  useEffect(() => {
    fetchBillingData();
    fetchSubscriptions();
    fetchReconciliationSummary();
  }, []);

 // ...existing code...
  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiGet('/admin/billing/metrics');
      setMetrics(data as BillingMetrics); // <-- Fix: type assertion
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };
// ...existing code...

  const fetchSubscriptions = async () => {
    try {
      setSubsLoading(true);
      setSubsError('');
      const data = await apiGet('/admin/billing/subscriptions');
      setSubscriptions(data as Subscription[]);
    } catch (err) {
      setSubsError(err instanceof Error ? err.message : 'Failed to load subscriptions');
    } finally {
      setSubsLoading(false);
    }
  };

  const fetchReconciliationSummary = async () => {
    try {
      setReconLoading(true);
      setReconError('');
      const data = await apiGet<ReconciliationDashboard>(
        '/admin/subscriptions/operations/reconciliation',
      );
      setReconciliationSummary(data?.summary || null);
    } catch (err) {
      setReconError(
        err instanceof Error ? err.message : 'Failed to load reconciliation summary',
      );
    } finally {
      setReconLoading(false);
    }
  };

  const reconciliationRiskCount =
    (reconciliationSummary?.unappliedManualPayments || 0) +
    (reconciliationSummary?.failedReceiptUploads || 0) +
    (reconciliationSummary?.invoicePaymentMismatches || 0) +
    (reconciliationSummary?.overdueTenants || 0);

  const formatCurrency = (amount: number) => {
    return `Ksh ${amount.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
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

      {/* Reconciliation Snapshot */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Reconciliation Snapshot</h2>
            <p className="text-xs text-gray-500">
              Live billing risk counts from operations reconciliation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                reconciliationRiskCount > 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {reconciliationRiskCount > 0
                ? `${reconciliationRiskCount} open reconciliation issue(s)`
                : 'No open reconciliation issues'}
            </span>
            <button
              onClick={() => router.push('/superadmin/billing/operations')}
              className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Open Billing Operations
            </button>
            <button
              onClick={fetchReconciliationSummary}
              className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {reconLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {reconError && (
          <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            {reconError}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 text-xs">
          <div className="rounded border p-2">
            <div className="text-gray-500">Unapplied Payments</div>
            <div className="font-semibold text-gray-900">
              {reconciliationSummary?.unappliedManualPayments || 0}
            </div>
          </div>
          <div className="rounded border p-2">
            <div className="text-gray-500">Receipt Upload Failures</div>
            <div className="font-semibold text-gray-900">
              {reconciliationSummary?.failedReceiptUploads || 0}
            </div>
          </div>
          <div className="rounded border p-2">
            <div className="text-gray-500">Invoice Mismatches</div>
            <div className="font-semibold text-gray-900">
              {reconciliationSummary?.invoicePaymentMismatches || 0}
            </div>
          </div>
          <div className="rounded border p-2">
            <div className="text-gray-500">Overdue Tenants</div>
            <div className="font-semibold text-gray-900">
              {reconciliationSummary?.overdueTenants || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Client Subscriptions Table */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Client Subscription Records</h2>
        </div>
        <div className="p-6">
          {subsLoading ? (
            <div className="text-gray-500">Loading client subscriptions...</div>
          ) : subsError ? (
            <div className="text-red-600">{subsError}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 text-left">Client</th>
                    <th className="py-2 px-4 text-left">Email</th>
                    <th className="py-2 px-4 text-left">Plan</th>
                    <th className="py-2 px-4 text-left">Price</th>
                    <th className="py-2 px-4 text-left">Status</th>
                    <th className="py-2 px-4 text-left">Start Date</th>
                    <th className="py-2 px-4 text-left">Renewal</th>
                    <th className="py-2 px-4 text-left">Cancel At Period End</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub, idx) => (
                    <tr key={sub.id || idx} className="border-b">
                      <td className="py-2 px-4">{sub.clientName || sub.tenantName || '-'}</td>
                      <td className="py-2 px-4">{sub.clientEmail || sub.email || '-'}</td>
                      <td className="py-2 px-4">{sub.plan?.name || '-'}</td>
                      <td className="py-2 px-4">{formatCurrency(sub.plan?.price || 0)}</td>
                      <td className="py-2 px-4">{sub.status || '-'}</td>
                      <td className="py-2 px-4">{sub.startDate ? new Date(sub.startDate).toLocaleDateString() : '-'}</td>
                      <td className="py-2 px-4">{sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '-'}</td>
                      <td className="py-2 px-4">{sub.cancelAtPeriodEnd ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
            <button 
              onClick={async () => {
                await Promise.all([fetchBillingData(), fetchReconciliationSummary()]);
              }}
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
              title="Billing Operations"
              description="Suspensions, grace extensions, and monthly billing controls"
              icon={<FaShieldAlt className="h-5 w-5" />}
              onClick={() => router.push('/superadmin/billing/operations')}
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
          <div className={`shrink-0 rounded-md p-3 ${colorMap[color].bg} ${colorMap[color].text}`}>
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
      <div className="shrink-0">
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