'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiPost } from '@/utils/api';
import { FaChevronLeft, FaSearch, FaSync } from 'react-icons/fa';
import API_BASE_URL from '@/config/apiConfig';

interface BillingOpsTenant {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  billingCycle: 'monthly';
  planName: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  nextBillingDate: string | null;
  daysToNextBilling: number;
  daysSinceExpiry: number;
  baseGraceDays: number;
  extensionGraceDays: number;
  totalGraceDays: number;
  graceEndsAt: string | null;
  billingState: 'active' | 'in_grace' | 'expired_over_grace' | 'expired' | 'no_subscription';
  inGrace: boolean;
  overGrace: boolean;
  isSuspended: boolean;
  linkedAccountsCount: number;
  accountActionLabel: string;
}

interface ReconciliationData {
  generatedAt: string;
  summary: {
    unappliedManualPayments: number;
    failedReceiptUploads: number;
    invoicePaymentMismatches: number;
    overdueTenants: number;
  };
  unappliedManualPayments: Array<{
    id: string;
    tenantId: string;
    tenantName: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    referenceCode: string | null;
  }>;
  failedReceiptUploads: Array<{
    id: string;
    tenantId: string;
    tenantName: string;
    createdAt: string;
    receiptUploadError: string | null;
  }>;
  invoicePaymentMismatches: Array<{
    invoiceId: string;
    invoiceNumber: string;
    tenantName: string;
    invoiceStatus: string;
    invoiceAmount: number;
    linkedPaymentAmount: number;
    issue: string;
    createdAt: string;
  }>;
  overdueTenants: Array<{
    tenantId: string;
    tenantName: string;
    billingState: string;
    daysSinceExpiry: number;
    isSuspended: boolean;
  }>;
}

type OpsModalAction = 'grace' | 'renew' | null;

const stateBadge: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  in_grace: 'bg-amber-100 text-amber-800',
  expired_over_grace: 'bg-red-100 text-red-700',
  expired: 'bg-rose-100 text-rose-700',
  no_subscription: 'bg-gray-100 text-gray-700',
};

export default function BillingOperationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [items, setItems] = useState<BillingOpsTenant[]>([]);
  const [search, setSearch] = useState('');
  const [state, setState] = useState('all');
  const [suspendedOnly, setSuspendedOnly] = useState(false);
  const [actionLoadingTenantId, setActionLoadingTenantId] = useState<string | null>(null);
  const [modalAction, setModalAction] = useState<OpsModalAction>(null);
  const [selectedTenant, setSelectedTenant] = useState<BillingOpsTenant | null>(null);
  const [graceDays, setGraceDays] = useState<number>(30);
  const [renewMonths, setRenewMonths] = useState<number>(1);
  const [actionReason, setActionReason] = useState('');
  const [reconciliation, setReconciliation] = useState<ReconciliationData | null>(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [reconError, setReconError] = useState('');
  const [reconSearch, setReconSearch] = useState('');
  const [reconTenantId, setReconTenantId] = useState('');
  const [reconOverdueOnly, setReconOverdueOnly] = useState(false);
  const [reconMismatchOnly, setReconMismatchOnly] = useState(false);

  const summary = useMemo(() => {
    const suspended = items.filter((x) => x.isSuspended).length;
    const inGrace = items.filter((x) => x.inGrace).length;
    const overGrace = items.filter((x) => x.overGrace).length;
    return {
      total: items.length,
      suspended,
      inGrace,
      overGrace,
    };
  }, [items]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const q = new URLSearchParams();
      if (search.trim()) q.set('search', search.trim());
      if (state !== 'all') q.set('state', state);
      if (suspendedOnly) q.set('suspendedOnly', 'true');

      const endpoint = `/admin/subscriptions/operations/tenants${q.toString() ? `?${q.toString()}` : ''}`;
      const data = await apiGet<BillingOpsTenant[]>(endpoint);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch billing operations data');
    } finally {
      setLoading(false);
    }
  };

  const fetchReconciliation = async () => {
    try {
      setReconLoading(true);
      setReconError('');

      const q = new URLSearchParams();
      if (reconSearch.trim()) q.set('search', reconSearch.trim());
      if (reconTenantId.trim()) q.set('tenantId', reconTenantId.trim());
      if (reconOverdueOnly) q.set('overdueOnly', 'true');
      if (reconMismatchOnly) q.set('mismatchOnly', 'true');

      const endpoint = `/admin/subscriptions/operations/reconciliation${q.toString() ? `?${q.toString()}` : ''}`;
      const data = await apiGet<ReconciliationData>(endpoint);
      setReconciliation(data);
    } catch (err) {
      setReconError(
        err instanceof Error ? err.message : 'Failed to load reconciliation dashboard',
      );
    } finally {
      setReconLoading(false);
    }
  };

  const exportReconciliationCsv = async () => {
    try {
      const q = new URLSearchParams();
      if (reconSearch.trim()) q.set('search', reconSearch.trim());
      if (reconTenantId.trim()) q.set('tenantId', reconTenantId.trim());
      if (reconOverdueOnly) q.set('overdueOnly', 'true');
      if (reconMismatchOnly) q.set('mismatchOnly', 'true');

      const url = `${API_BASE_URL}/admin/subscriptions/operations/reconciliation/export-csv${q.toString() ? `?${q.toString()}` : ''}`;
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to export reconciliation CSV');
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `billing-reconciliation-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setReconError(err instanceof Error ? err.message : 'CSV export failed');
    }
  };

  useEffect(() => {
    fetchData();
    fetchReconciliation();
  }, []);

  const runTenantAction = async (tenantId: string, action: 'reactivate' | 'suspend') => {
    try {
      setSuccess('');
      setActionLoadingTenantId(tenantId);
      if (action === 'reactivate') {
        await apiPatch(`/admin/subscriptions/operations/tenants/${tenantId}/reactivate`);
        setSuccess('Tenant access restriction removed successfully.');
      } else {
        await apiPatch(`/admin/subscriptions/operations/tenants/${tenantId}/suspend`);
        setSuccess('Tenant access restricted successfully.');
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoadingTenantId(null);
    }
  };

  const closeActionModal = () => {
    setModalAction(null);
    setSelectedTenant(null);
    setActionReason('');
    setGraceDays(30);
    setRenewMonths(1);
  };

  const openGraceModal = (tenant: BillingOpsTenant) => {
    setError('');
    setSuccess('');
    setSelectedTenant(tenant);
    setModalAction('grace');
    setActionReason('');
    setGraceDays(30);
  };

  const openRenewModal = (tenant: BillingOpsTenant) => {
    setError('');
    setSuccess('');
    setSelectedTenant(tenant);
    setModalAction('renew');
    setActionReason('');
    setRenewMonths(1);
  };

  const submitModalAction = async () => {
    if (!selectedTenant || !modalAction) return;

    try {
      setError('');
      setSuccess('');
      setActionLoadingTenantId(selectedTenant.tenantId);

      if (modalAction === 'grace') {
        if (!Number.isFinite(graceDays) || graceDays < 1 || graceDays > 365) {
          setError('Grace days must be between 1 and 365');
          return;
        }

        const result = await apiPost<{
          extensionDaysAdded: number;
          totalGraceDays: number;
          graceEndsAt: string;
        }>(
          `/admin/subscriptions/operations/tenants/${selectedTenant.tenantId}/grace-extension`,
          {
            days: graceDays,
            reason: actionReason,
          },
        );

        await fetchData();
        setSuccess(
          `Grace extended by ${result.extensionDaysAdded} day(s). Total grace is now ${result.totalGraceDays} day(s), ending ${new Date(result.graceEndsAt).toLocaleDateString()}.`,
        );
      } else if (modalAction === 'renew') {
        if (!Number.isFinite(renewMonths) || renewMonths < 1 || renewMonths > 24) {
          setError('Months must be between 1 and 24');
          return;
        }

        const result = await apiPost<{
          renewedMonths: number;
          currentPeriodEnd: string | null;
        }>(
          `/admin/subscriptions/operations/tenants/${selectedTenant.tenantId}/manual-renewal`,
          {
            months: renewMonths,
            reason: actionReason,
          },
        );

        await fetchData();
        setSuccess(
          `Manual renewal applied for ${result.renewedMonths} month(s). Next billing date is ${result.currentPeriodEnd ? new Date(result.currentPeriodEnd).toLocaleDateString() : 'updated'}.`,
        );
      }

      closeActionModal();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : modalAction === 'grace'
            ? 'Failed to extend grace period'
            : 'Failed to apply manual renewal',
      );
    } finally {
      setActionLoadingTenantId(null);
    }
  };

  const bulkReactivateInGrace = async () => {
    const targets = items.filter((x) => x.isSuspended && x.inGrace);
    if (!targets.length) return;

    try {
      setLoading(true);
      for (const row of targets) {
        await apiPatch(`/admin/subscriptions/operations/tenants/${row.tenantId}/reactivate`);
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk reactivation failed');
    } finally {
      setLoading(false);
    }
  };

  const bulkSuspendOverGrace = async () => {
    const targets = items.filter((x) => !x.isSuspended && x.overGrace);
    if (!targets.length) return;

    try {
      setLoading(true);
      for (const row of targets) {
        await apiPatch(`/admin/subscriptions/operations/tenants/${row.tenantId}/suspend`);
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk suspension failed');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <button
            onClick={() => router.push('/superadmin/billing')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <FaChevronLeft className="mr-1" /> Back to Billing
          </button>
          <h1 className="text-xl font-semibold text-gray-900 mt-2">Billing Operations</h1>
          <p className="text-xs text-gray-500">
            Monthly billing oversight: suspended accounts, next billing days, grace control, and account actions.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded text-sm bg-white hover:bg-gray-50"
        >
          <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <div className="border rounded p-2 bg-white">Total: <span className="font-semibold">{summary.total}</span></div>
        <div className="border rounded p-2 bg-white">Suspended: <span className="font-semibold">{summary.suspended}</span></div>
        <div className="border rounded p-2 bg-white">In Grace: <span className="font-semibold">{summary.inGrace}</span></div>
        <div className="border rounded p-2 bg-white">Over Grace: <span className="font-semibold">{summary.overGrace}</span></div>
      </div>

      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-3 text-gray-400 text-xs" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant name/email"
            className="w-full pl-8 pr-2 py-2 border rounded text-sm"
          />
        </div>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="px-2 py-2 border rounded text-sm"
        >
          <option value="all">All states</option>
          <option value="active">Active</option>
          <option value="in_grace">In grace</option>
          <option value="expired_over_grace">Expired over grace</option>
          <option value="expired">Expired</option>
          <option value="no_subscription">No subscription</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={suspendedOnly}
            onChange={(e) => setSuspendedOnly(e.target.checked)}
          />
          Suspended only
        </label>
        <button
          onClick={fetchData}
          className="px-3 py-2 border rounded text-sm bg-gray-900 text-white"
        >
          Apply
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={bulkReactivateInGrace}
          className="px-3 py-2 text-xs border rounded bg-green-50 text-green-700 hover:bg-green-100"
        >
          Reactivate All In-Grace Suspended
        </button>
        <button
          onClick={bulkSuspendOverGrace}
          className="px-3 py-2 text-xs border rounded bg-red-50 text-red-700 hover:bg-red-100"
        >
          Suspend All Over-Grace
        </button>
      </div>

      <div className="rounded border bg-white p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Reconciliation Dashboard</h2>
            <p className="text-xs text-gray-500">
              Tracks unapplied manual payments, failed receipt uploads, invoice-payment mismatches, and overdue tenants.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchReconciliation}
              className="px-3 py-2 border rounded text-xs bg-white hover:bg-gray-50"
            >
              Refresh Reconciliation
            </button>
            <button
              onClick={exportReconciliationCsv}
              className="px-3 py-2 border rounded text-xs bg-gray-900 text-white hover:bg-black"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
          <input
            value={reconSearch}
            onChange={(e) => setReconSearch(e.target.value)}
            className="rounded border px-2 py-2"
            placeholder="Search tenant"
          />
          <input
            value={reconTenantId}
            onChange={(e) => setReconTenantId(e.target.value)}
            className="rounded border px-2 py-2"
            placeholder="Tenant ID (optional)"
          />
          <label className="inline-flex items-center gap-2 rounded border px-2 py-2">
            <input
              type="checkbox"
              checked={reconOverdueOnly}
              onChange={(e) => setReconOverdueOnly(e.target.checked)}
            />
            Overdue only
          </label>
          <label className="inline-flex items-center gap-2 rounded border px-2 py-2">
            <input
              type="checkbox"
              checked={reconMismatchOnly}
              onChange={(e) => setReconMismatchOnly(e.target.checked)}
            />
            Mismatches only
          </label>
        </div>

        <div>
          <button
            onClick={fetchReconciliation}
            className="px-3 py-2 border rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
          >
            Apply Reconciliation Filters
          </button>
        </div>

        {reconError && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
            {reconError}
          </div>
        )}

        {reconciliation && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="border rounded p-2 bg-white">Unapplied: <span className="font-semibold">{reconciliation.summary.unappliedManualPayments}</span></div>
              <div className="border rounded p-2 bg-white">Receipt Failures: <span className="font-semibold">{reconciliation.summary.failedReceiptUploads}</span></div>
              <div className="border rounded p-2 bg-white">Mismatches: <span className="font-semibold">{reconciliation.summary.invoicePaymentMismatches}</span></div>
              <div className="border rounded p-2 bg-white">Overdue Tenants: <span className="font-semibold">{reconciliation.summary.overdueTenants}</span></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
              <div className="border rounded p-2">
                <div className="font-semibold text-gray-800 mb-2">Unapplied Manual Payments</div>
                <div className="space-y-1 max-h-44 overflow-y-auto">
                  {reconciliation.unappliedManualPayments.slice(0, 20).map((row) => (
                    <div key={row.id} className="flex items-center justify-between border rounded p-2">
                      <div>
                        <div className="font-medium">{row.tenantName}</div>
                        <div className="text-gray-500">{row.referenceCode || row.id}</div>
                      </div>
                      <div className="text-right">
                        <div>{row.amount.toLocaleString()} {row.currency}</div>
                        <div className="text-gray-500">{new Date(row.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                  {!reconciliation.unappliedManualPayments.length && <div className="text-gray-500">No unapplied payments.</div>}
                </div>
              </div>

              <div className="border rounded p-2">
                <div className="font-semibold text-gray-800 mb-2">Failed Receipt Uploads</div>
                <div className="space-y-1 max-h-44 overflow-y-auto">
                  {reconciliation.failedReceiptUploads.slice(0, 20).map((row) => (
                    <div key={row.id} className="border rounded p-2">
                      <div className="font-medium">{row.tenantName}</div>
                      <div className="text-gray-500">{row.receiptUploadError || 'Receipt upload failed'}</div>
                    </div>
                  ))}
                  {!reconciliation.failedReceiptUploads.length && <div className="text-gray-500">No receipt upload failures.</div>}
                </div>
              </div>

              <div className="border rounded p-2">
                <div className="font-semibold text-gray-800 mb-2">Invoice-Payment Mismatches</div>
                <div className="space-y-1 max-h-44 overflow-y-auto">
                  {reconciliation.invoicePaymentMismatches.slice(0, 20).map((row) => (
                    <div key={row.invoiceId} className="border rounded p-2">
                      <div className="font-medium">{row.tenantName} - {row.invoiceNumber}</div>
                      <div className="text-gray-500">{row.issue}</div>
                    </div>
                  ))}
                  {!reconciliation.invoicePaymentMismatches.length && <div className="text-gray-500">No mismatches.</div>}
                </div>
              </div>

              <div className="border rounded p-2">
                <div className="font-semibold text-gray-800 mb-2">Overdue Tenants</div>
                <div className="space-y-1 max-h-44 overflow-y-auto">
                  {reconciliation.overdueTenants.slice(0, 20).map((row) => (
                    <div key={row.tenantId} className="flex items-center justify-between border rounded p-2">
                      <div>
                        <div className="font-medium">{row.tenantName}</div>
                        <div className="text-gray-500">Overdue {row.daysSinceExpiry} day(s)</div>
                      </div>
                      <div className={`text-[11px] ${row.isSuspended ? 'text-red-700' : 'text-amber-700'}`}>
                        {row.isSuspended ? 'Suspended' : 'Not suspended'}
                      </div>
                    </div>
                  ))}
                  {!reconciliation.overdueTenants.length && <div className="text-gray-500">No overdue tenants.</div>}
                </div>
              </div>
            </div>
          </>
        )}

        {reconLoading && <div className="text-xs text-gray-500">Loading reconciliation data...</div>}
      </div>

      {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{success}</div>}
      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}

      <div className="overflow-x-auto border rounded bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 text-gray-600 uppercase">
            <tr>
              <th className="px-2 py-2 text-left">Tenant</th>
              <th className="px-2 py-2 text-left">Plan</th>
              <th className="px-2 py-2 text-left">State</th>
              <th className="px-2 py-2 text-left">Next Billing</th>
              <th className="px-2 py-2 text-left">Grace Ends</th>
              <th className="px-2 py-2 text-left">Accounts</th>
              <th className="px-2 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.tenantId} className="border-t align-top">
                <td className="px-2 py-2 min-w-45">
                  <div className="font-semibold text-gray-900">{row.tenantName}</div>
                  <div className="text-gray-500">{row.tenantEmail || '-'}</div>
                  <div className="text-gray-500">Cycle: monthly</div>
                </td>
                <td className="px-2 py-2">
                  <div>{row.planName || '-'}</div>
                  <div className="text-gray-500">Status: {row.subscriptionStatus || '-'}</div>
                </td>
                <td className="px-2 py-2">
                  <span className={`inline-flex px-2 py-0.5 rounded ${stateBadge[row.billingState] || 'bg-gray-100 text-gray-700'}`}>
                    {row.billingState}
                  </span>
                  <div className="text-gray-500 mt-1">
                    {row.isSuspended ? 'Access restricted' : 'Full access'}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div>{formatDate(row.nextBillingDate)}</div>
                  <div className="text-gray-500">
                    {row.daysToNextBilling > 0 ? `${row.daysToNextBilling} day(s) left` : `Expired ${row.daysSinceExpiry} day(s) ago`}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div>{formatDate(row.graceEndsAt)}</div>
                  <div className="text-gray-500">
                    Base {row.baseGraceDays} + Extra {row.extensionGraceDays}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div>{row.linkedAccountsCount} linked</div>
                </td>
                <td className="px-2 py-2 min-w-55">
                  <div className="flex flex-wrap gap-1">
                    {row.isSuspended ? (
                      <button
                        disabled={actionLoadingTenantId === row.tenantId}
                        onClick={() => runTenantAction(row.tenantId, 'reactivate')}
                        className="px-2 py-1 border rounded bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                      >
                        Remove Restriction
                      </button>
                    ) : (
                      <button
                        disabled={actionLoadingTenantId === row.tenantId}
                        onClick={() => runTenantAction(row.tenantId, 'suspend')}
                        className="px-2 py-1 border rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        Restrict Access
                      </button>
                    )}

                    <button
                      disabled={actionLoadingTenantId === row.tenantId}
                      onClick={() => openGraceModal(row)}
                      className="px-2 py-1 border rounded bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    >
                      Add Grace
                    </button>

                    <button
                      disabled={actionLoadingTenantId === row.tenantId}
                      onClick={() => openRenewModal(row)}
                      className="px-2 py-1 border rounded bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      Manual Renew
                    </button>

                    <button
                      onClick={() => router.push(`/superadmin/billing/tenants/${row.tenantId}`)}
                      className="px-2 py-1 border rounded bg-gray-50 text-gray-700 hover:bg-gray-100"
                    >
                      Tenant Details
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && !loading && (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-center text-gray-500">
                  No tenants found for current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalAction && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              {modalAction === 'grace' ? 'Add Grace Period' : 'Manual Monthly Renewal'}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Tenant: <span className="font-medium text-gray-800">{selectedTenant.tenantName}</span>
            </p>

            <div className="mt-4 space-y-3">
              {modalAction === 'grace' ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Extra grace days (1-365)</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={graceDays}
                    onChange={(e) => setGraceDays(Number(e.target.value || 0))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Renew for months (1-24)</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={renewMonths}
                    onChange={(e) => setRenewMonths(Number(e.target.value || 0))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Reason / reference (optional)
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. Bank transfer ref"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeActionModal}
                className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={actionLoadingTenantId === selectedTenant.tenantId}
                onClick={submitModalAction}
                className="rounded bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black disabled:opacity-50"
              >
                {actionLoadingTenantId === selectedTenant.tenantId ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
