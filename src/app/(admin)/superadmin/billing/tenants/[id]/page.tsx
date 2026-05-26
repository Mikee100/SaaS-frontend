"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiPost } from '@/utils/api';
import { FaChevronLeft, FaPlus, FaSync } from 'react-icons/fa';
import { getFullAssetUrl } from '@/utils/logoUrl';
import API_BASE_URL from '@/config/apiConfig';

interface BillingOpsTenant {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  planName: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  graceEndsAt: string | null;
  baseGraceDays: number;
  extensionGraceDays: number;
  totalGraceDays: number;
  isSuspended: boolean;
  billingState:
    | 'active'
    | 'in_grace'
    | 'expired_over_grace'
    | 'expired'
    | 'no_subscription';
}

interface ManualPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  method: string | null;
  referenceCode: string | null;
  payerName: string | null;
  receiptUrl: string | null;
  notes: string | null;
  months: number;
  appliedToSubscription: boolean;
}

interface TimelineItem {
  id: string;
  at: string;
  type: string;
  title: string;
  details: Record<string, unknown>;
}

interface ActionPreview {
  action: 'grace' | 'renew' | 'suspend' | 'reactivate';
  currentPeriodEnd: string | null;
  newPeriodEnd: string | null;
  currentGraceEnd: string | null;
  newGraceEnd: string | null;
  currentAccess: 'restricted' | 'full_access';
  projectedAccess: 'restricted' | 'full_access';
  accessImpact: string;
}

type ActionKind = 'grace' | 'renew' | 'suspend' | 'reactivate' | null;

const stateBadge: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  in_grace: 'bg-amber-100 text-amber-800',
  expired_over_grace: 'bg-red-100 text-red-700',
  expired: 'bg-rose-100 text-rose-700',
  no_subscription: 'bg-gray-100 text-gray-700',
};

export default function TenantBillingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tenant, setTenant] = useState<BillingOpsTenant | null>(null);
  const [payments, setPayments] = useState<ManualPayment[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [method, setMethod] = useState('bank_transfer');
  const [referenceCode, setReferenceCode] = useState('');
  const [payerName, setPayerName] = useState('');
  const [notes, setNotes] = useState('');
  const [months, setMonths] = useState('1');
  const [applyNow, setApplyNow] = useState(true);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [actionModal, setActionModal] = useState<ActionKind>(null);
  const [actionDays, setActionDays] = useState(30);
  const [actionMonths, setActionMonths] = useState(1);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [preview, setPreview] = useState<ActionPreview | null>(null);

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '-';
    return new Date(value).toLocaleString();
  };

  const refreshAll = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError('');

      const [opsData, manualPayments, tenantTimeline] = await Promise.all([
        apiGet<BillingOpsTenant[]>('/admin/subscriptions/operations/tenants'),
        apiGet<ManualPayment[]>(
          `/admin/subscriptions/operations/tenants/${tenantId}/manual-payments`,
        ),
        apiGet<TimelineItem[]>(
          `/admin/subscriptions/operations/tenants/${tenantId}/timeline`,
        ),
      ]);

      const foundTenant = Array.isArray(opsData)
        ? opsData.find((row) => row.tenantId === tenantId)
        : null;

      setTenant(foundTenant || null);
      setPayments(Array.isArray(manualPayments) ? manualPayments : []);
      setTimeline(Array.isArray(tenantTimeline) ? tenantTimeline : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load tenant billing details',
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    let mounted = true;
    params.then((resolved) => {
      if (mounted) setTenantId(resolved.id);
    });
    return () => {
      mounted = false;
    };
  }, [params]);

  useEffect(() => {
    if (tenantId) refreshAll();
  }, [tenantId, refreshAll]);

  useEffect(() => {
    const loadPreview = async () => {
      if (!tenantId || !actionModal) {
        setPreview(null);
        return;
      }

      const q = new URLSearchParams();
      q.set('action', actionModal);
      if (actionModal === 'grace') q.set('days', String(actionDays));
      if (actionModal === 'renew') q.set('months', String(actionMonths));

      try {
        const data = await apiGet<ActionPreview>(
          `/admin/subscriptions/operations/tenants/${tenantId}/action-preview?${q.toString()}`,
        );
        setPreview(data);
      } catch {
        setPreview(null);
      }
    };

    loadPreview();
  }, [tenantId, actionModal, actionDays, actionMonths]);

  const summaryLabel = useMemo(() => {
    if (!tenant) return '-';
    return tenant.isSuspended ? 'Access restricted' : 'Full access';
  }, [tenant]);

  const openAction = (kind: ActionKind) => {
    setActionModal(kind);
    setActionDays(30);
    setActionMonths(1);
    setActionReason('');
    setError('');
    setSuccess('');
  };

  const closeAction = () => {
    setActionModal(null);
    setPreview(null);
    setActionReason('');
  };

  const submitAction = async () => {
    if (!tenantId || !actionModal) return;

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      if (actionModal === 'grace') {
        await apiPost(
          `/admin/subscriptions/operations/tenants/${tenantId}/grace-extension`,
          {
            days: actionDays,
            reason: actionReason,
          },
        );
        setSuccess('Grace extension applied successfully.');
      } else if (actionModal === 'renew') {
        await apiPost(
          `/admin/subscriptions/operations/tenants/${tenantId}/manual-renewal`,
          {
            months: actionMonths,
            reason: actionReason,
          },
        );
        setSuccess('Manual renewal applied. Internal invoice generated.');
      } else if (actionModal === 'suspend') {
        await apiPatch(`/admin/subscriptions/operations/tenants/${tenantId}/suspend`);
        setSuccess('Tenant access restricted.');
      } else if (actionModal === 'reactivate') {
        await apiPatch(
          `/admin/subscriptions/operations/tenants/${tenantId}/reactivate`,
        );
        setSuccess('Tenant access restored.');
      }

      closeAction();
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply billing action');
    } finally {
      setActionLoading(false);
    }
  };

  const uploadReceipt = async () => {
    if (!tenantId || !receiptFile) return '';

    const fd = new FormData();
    fd.append('file', receiptFile);

    const res = await fetch(
      `${API_BASE_URL}/admin/subscriptions/operations/tenants/${tenantId}/manual-payments/upload-receipt`,
      {
        method: 'POST',
        credentials: 'include',
        body: fd,
      },
    );

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || 'Failed to upload receipt');
    }

    const data = (await res.json()) as { receiptUrl?: string };
    return data.receiptUrl || '';
  };

  const submitManualPayment = async () => {
    if (!tenantId) return;

    const parsedAmount = Number(amount);
    const parsedMonths = Number(months);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Payment amount must be a positive number');
      return;
    }

    if (!Number.isFinite(parsedMonths) || parsedMonths < 1 || parsedMonths > 24) {
      setError('Months must be between 1 and 24');
      return;
    }

    try {
      setSubmittingPayment(true);
      setError('');
      setSuccess('');

      const receiptUrl = receiptFile ? await uploadReceipt() : undefined;

      await apiPost(`/admin/subscriptions/operations/tenants/${tenantId}/manual-payments`, {
        amount: parsedAmount,
        currency,
        method,
        referenceCode: referenceCode || undefined,
        payerName: payerName || undefined,
        receiptUrl,
        notes: notes || undefined,
        months: parsedMonths,
        applyNow,
        reason: notes || 'Manual payment register entry',
      });

      setAmount('');
      setReferenceCode('');
      setPayerName('');
      setNotes('');
      setMonths('1');
      setReceiptFile(null);
      setSuccess(
        applyNow
          ? 'Manual payment recorded and applied now. Subscription renewed and invoice created.'
          : 'Manual payment recorded successfully.',
      );
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record manual payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const applyPaymentNow = async (payment: ManualPayment) => {
    if (!tenantId) return;

    try {
      setError('');
      setSuccess('');
      await apiPost(
        `/admin/subscriptions/operations/tenants/${tenantId}/manual-payments/${payment.id}/apply`,
        {
          months: payment.months,
          reason: payment.notes || 'Applied from manual payment register',
        },
      );
      setSuccess('Payment applied. Subscription renewed and invoice generated.');
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply manual payment');
    }
  };

  if (loading && !tenant) {
    return <div className="p-8">Loading billing details...</div>;
  }

  if (!tenant) {
    return (
      <div className="p-8 space-y-3">
        <div className="text-gray-700">Tenant not found.</div>
        <button
          onClick={() => router.push('/superadmin/billing/operations')}
          className="inline-flex items-center rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <FaChevronLeft className="mr-2" /> Back to Billing Operations
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <button
            onClick={() => router.push('/superadmin/billing/operations')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <FaChevronLeft className="mr-1" /> Back to Billing Operations
          </button>
          <h1 className="mt-2 text-xl font-semibold text-gray-900">{tenant.tenantName}</h1>
          <p className="text-xs text-gray-500">{tenant.tenantEmail || '-'}</p>
        </div>
        <button
          onClick={refreshAll}
          className="inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
        >
          <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {success && (
        <div className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-700">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded border bg-white p-3">
          <div className="text-xs text-gray-500">Plan</div>
          <div className="font-semibold text-gray-900">{tenant.planName || '-'}</div>
          <div className="mt-1 text-xs text-gray-500">Status: {tenant.subscriptionStatus || '-'}</div>
        </div>
        <div className="rounded border bg-white p-3">
          <div className="text-xs text-gray-500">Billing State</div>
          <div className="mt-1">
            <span className={`inline-flex rounded px-2 py-0.5 text-xs ${stateBadge[tenant.billingState] || 'bg-gray-100 text-gray-700'}`}>
              {tenant.billingState}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">{summaryLabel}</div>
        </div>
        <div className="rounded border bg-white p-3">
          <div className="text-xs text-gray-500">Period / Grace</div>
          <div className="text-xs text-gray-700">Period End: {formatDate(tenant.currentPeriodEnd)}</div>
          <div className="text-xs text-gray-700">Grace End: {formatDate(tenant.graceEndsAt)}</div>
          <div className="text-xs text-gray-500">
            Base {tenant.baseGraceDays} + Extra {tenant.extensionGraceDays} (Total {tenant.totalGraceDays})
          </div>
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Billing Actions with Preview</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => openAction('grace')}
            className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 hover:bg-amber-100"
          >
            Add Grace (Preview)
          </button>
          <button
            onClick={() => openAction('renew')}
            className="rounded border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-700 hover:bg-blue-100"
          >
            Manual Renew (Preview)
          </button>
          {tenant.isSuspended ? (
            <button
              onClick={() => openAction('reactivate')}
              className="rounded border border-green-300 bg-green-50 px-3 py-2 text-xs text-green-700 hover:bg-green-100"
            >
              Reactivate Access (Preview)
            </button>
          ) : (
            <button
              onClick={() => openAction('suspend')}
              className="rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100"
            >
              Restrict Access (Preview)
            </button>
          )}
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Manual Payment Register</h2>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Amount"
          />
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Currency"
          />
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </select>
          <input
            type="number"
            min={1}
            max={24}
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Months"
          />
          <input
            value={referenceCode}
            onChange={(e) => setReferenceCode(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Reference Code"
          />
          <input
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Payer Name"
          />
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="md:col-span-2 w-full rounded border px-3 py-2 text-sm"
            placeholder="Notes"
          />
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
            className="md:col-span-2 w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <label className="mt-3 inline-flex items-center gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={applyNow}
            onChange={(e) => setApplyNow(e.target.checked)}
          />
          Apply to subscription now
        </label>

        <div className="mt-3">
          <button
            onClick={submitManualPayment}
            disabled={submittingPayment}
            className="inline-flex items-center rounded bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black disabled:opacity-50"
          >
            <FaPlus className="mr-2" />
            {submittingPayment ? 'Saving...' : 'Record Manual Payment'}
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded border">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-2 py-2 text-left">Date</th>
                <th className="px-2 py-2 text-left">Amount</th>
                <th className="px-2 py-2 text-left">Method</th>
                <th className="px-2 py-2 text-left">Reference</th>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2 text-left">Proof</th>
                <th className="px-2 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t">
                  <td className="px-2 py-2">{formatDate(payment.createdAt)}</td>
                  <td className="px-2 py-2">
                    {payment.amount.toLocaleString()} {payment.currency}
                  </td>
                  <td className="px-2 py-2">{payment.method || '-'}</td>
                  <td className="px-2 py-2">{payment.referenceCode || '-'}</td>
                  <td className="px-2 py-2">
                    {payment.appliedToSubscription ? 'applied' : payment.status}
                  </td>
                  <td className="px-2 py-2">
                    {payment.receiptUrl ? (
                      <a
                        href={getFullAssetUrl(payment.receiptUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {!payment.appliedToSubscription ? (
                      <button
                        onClick={() => applyPaymentNow(payment)}
                        className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                      >
                        Apply Now
                      </button>
                    ) : (
                      <span className="text-gray-500">Applied</span>
                    )}
                  </td>
                </tr>
              ))}
              {!payments.length && (
                <tr>
                  <td colSpan={7} className="px-2 py-4 text-center text-gray-500">
                    No manual payment records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Subscription Timeline</h2>
        <div className="mt-3 space-y-2">
          {timeline.map((item) => (
            <div key={item.id} className="rounded border border-gray-200 p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-gray-900">{item.title}</div>
                <div className="text-xs text-gray-500">{formatDate(item.at)}</div>
              </div>
              <div className="mt-1 text-xs text-gray-600">Type: {item.type}</div>
            </div>
          ))}
          {!timeline.length && (
            <div className="rounded border border-gray-200 p-3 text-xs text-gray-500">
              No timeline records found.
            </div>
          )}
        </div>
      </div>

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Billing Action Preview</h3>
            <p className="text-xs text-gray-500">Action: {actionModal}</p>

            <div className="mt-3 space-y-2">
              {actionModal === 'grace' && (
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={actionDays}
                  onChange={(e) => setActionDays(Number(e.target.value || 0))}
                  className="w-full rounded border px-3 py-2 text-sm"
                  placeholder="Grace days"
                />
              )}

              {actionModal === 'renew' && (
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={actionMonths}
                  onChange={(e) => setActionMonths(Number(e.target.value || 0))}
                  className="w-full rounded border px-3 py-2 text-sm"
                  placeholder="Renew months"
                />
              )}

              <textarea
                rows={2}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Reason / reference"
              />

              {preview && (
                <div className="rounded border bg-gray-50 p-3 text-xs text-gray-700">
                  <div>Current period end: {formatDate(preview.currentPeriodEnd)}</div>
                  <div>New period end: {formatDate(preview.newPeriodEnd)}</div>
                  <div>Current grace end: {formatDate(preview.currentGraceEnd)}</div>
                  <div>New grace end: {formatDate(preview.newGraceEnd)}</div>
                  <div>Current access: {preview.currentAccess}</div>
                  <div>Projected access: {preview.projectedAccess}</div>
                  <div className="mt-1 font-medium text-gray-900">Impact: {preview.accessImpact}</div>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeAction}
                className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={actionLoading}
                className="rounded bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black disabled:opacity-50"
              >
                {actionLoading ? 'Applying...' : 'Apply Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
