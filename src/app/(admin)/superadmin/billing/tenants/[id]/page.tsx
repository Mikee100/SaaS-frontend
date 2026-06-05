"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiPost } from '@/utils/api';
import { FaChevronLeft, FaPlus, FaSync } from 'react-icons/fa';
import { getFullAssetUrl } from '@/utils/logoUrl';
import API_BASE_URL from '@/config/apiConfig';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

interface BillingOpsTenant {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  planName: string | null;
  subscriptionId?: string | null;
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

interface PlanOption {
  id: string;
  name: string;
  interval?: string;
  isActive?: boolean;
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
  invoiceId?: string | null;
  receiptUploadFailed?: boolean;
  receiptUploadError?: string | null;
}

interface ManualInvoice {
  id: string;
  number: string;
  amount: number;
  status: 'draft' | 'issued' | 'paid' | 'void';
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  linkedPaymentId: string | null;
  linkedPaymentAmount: number | null;
  linkedPaymentStatus: string | null;
  linkedReceiptUrl: string | null;
  linkedReferenceCode: string | null;
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
  const [invoices, setInvoices] = useState<ManualInvoice[]>([]);

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
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState<'draft' | 'issued' | 'paid' | 'void'>('draft');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [invoiceActionLoading, setInvoiceActionLoading] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<ActionKind>(null);
  const [actionDays, setActionDays] = useState(30);
  const [actionMonths, setActionMonths] = useState(1);
  const [actionPlanId, setActionPlanId] = useState('');
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [initialPlanId, setInitialPlanId] = useState('');
  const [assigningInitialPlan, setAssigningInitialPlan] = useState(false);
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

      const [opsData, manualPayments, tenantTimeline, manualInvoices] = await Promise.all([
        apiGet<BillingOpsTenant[]>('/admin/subscriptions/operations/tenants'),
        apiGet<ManualPayment[]>(
          `/admin/subscriptions/operations/tenants/${tenantId}/manual-payments`,
        ),
        apiGet<TimelineItem[]>(
          `/admin/subscriptions/operations/tenants/${tenantId}/timeline`,
        ),
        apiGet<ManualInvoice[]>(
          `/admin/subscriptions/operations/tenants/${tenantId}/manual-invoices`,
        ),
      ]);

      const foundTenant = Array.isArray(opsData)
        ? opsData.find((row) => row.tenantId === tenantId)
        : null;

      setTenant(foundTenant || null);
      setPayments(Array.isArray(manualPayments) ? manualPayments : []);
      setTimeline(Array.isArray(tenantTimeline) ? tenantTimeline : []);
      setInvoices(Array.isArray(manualInvoices) ? manualInvoices : []);
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

  const needsInitialPlan =
    tenant?.billingState === 'no_subscription' || !tenant?.subscriptionId;

  const loadPlans = useCallback(async () => {
    try {
      setPlansLoading(true);
      const response = await apiGet<PlanOption[]>('/admin/plans');
      const activePlans = Array.isArray(response)
        ? response.filter((p) => p?.isActive !== false)
        : [];
      setPlans(activePlans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    if (needsInitialPlan) {
      void loadPlans();
    }
  }, [needsInitialPlan, loadPlans]);

  const openAction = (kind: ActionKind) => {
    setActionModal(kind);
    setActionDays(30);
    setActionMonths(1);
    setActionPlanId('');
    setActionReason('');
    setError('');
    setSuccess('');

    if (kind === 'renew' && needsInitialPlan) {
      void loadPlans();
    }
  };

  const assignInitialPlan = async () => {
    if (!tenantId || !initialPlanId) {
      setError('Select a plan first');
      return;
    }

    try {
      setAssigningInitialPlan(true);
      setError('');
      setSuccess('');

      await apiPost(
        `/admin/subscriptions/operations/tenants/${tenantId}/manual-renewal`,
        {
          months: 1,
          reason: 'Initial plan assignment from superadmin billing tenant page',
          planId: initialPlanId,
        },
      );

      setSuccess('Initial subscription plan assigned via manual renewal.');
      setInitialPlanId('');
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign initial plan');
    } finally {
      setAssigningInitialPlan(false);
    }
  };

  const closeAction = () => {
    setActionModal(null);
    setPreview(null);
    setActionPlanId('');
    setActionReason('');
  };

  const submitAction = async () => {
    if (!tenantId || !actionModal) return;
    if (!tenant) {
      setError('Tenant data is not loaded yet');
      return;
    }

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
        const requiresPlan = tenant.billingState === 'no_subscription' || !tenant.subscriptionId;
        if (requiresPlan && !actionPlanId) {
          setError('Select a plan to create the first subscription for this tenant');
          return;
        }

        await apiPost(
          `/admin/subscriptions/operations/tenants/${tenantId}/manual-renewal`,
          {
            months: actionMonths,
            reason: actionReason,
            planId: requiresPlan ? actionPlanId : undefined,
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

      let receiptUrl: string | undefined;
      let receiptUploadFailed = false;
      let receiptUploadError: string | undefined;
      if (receiptFile) {
        try {
          receiptUrl = await uploadReceipt();
        } catch (uploadErr) {
          receiptUploadFailed = true;
          receiptUploadError =
            uploadErr instanceof Error ? uploadErr.message : 'Receipt upload failed';
        }
      }

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
        receiptUploadFailed,
        receiptUploadError,
        reason: notes || 'Manual payment register entry',
      });

      setAmount('');
      setReferenceCode('');
      setPayerName('');
      setNotes('');
      setMonths('1');
      setReceiptFile(null);
      setSuccess(
        receiptUploadFailed
          ? 'Payment saved, but receipt upload failed. This is visible in reconciliation dashboard.'
          : applyNow
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

  const createManualInvoice = async () => {
    if (!tenantId) return;
    const parsedAmount = Number(invoiceAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError('Invoice amount must be 0 or a positive number');
      return;
    }

    try {
      setSubmittingInvoice(true);
      setError('');
      setSuccess('');
      await apiPost(`/admin/subscriptions/operations/tenants/${tenantId}/manual-invoices`, {
        amount: parsedAmount,
        status: invoiceStatus,
        dueDate: invoiceDueDate || undefined,
        notes: invoiceNotes || undefined,
      });

      setInvoiceAmount('');
      setInvoiceDueDate('');
      setInvoiceStatus('draft');
      setInvoiceNotes('');
      setSuccess('Manual invoice created.');
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create manual invoice');
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const transitionInvoiceStatus = async (
    invoice: ManualInvoice,
    status: 'issued' | 'paid' | 'void',
  ) => {
    if (!tenantId) return;
    try {
      setInvoiceActionLoading(invoice.id);
      setError('');
      setSuccess('');

      await apiPatch(
        `/admin/subscriptions/operations/tenants/${tenantId}/manual-invoices/${invoice.id}/status`,
        {
          status,
          reason: `Updated from UI to ${status}`,
        },
      );
      setSuccess(`Invoice ${invoice.number} moved to ${status}.`);
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice status');
    } finally {
      setInvoiceActionLoading(null);
    }
  };

  const downloadInvoiceBundle = async (invoice: ManualInvoice) => {
    try {
      const pdf = new jsPDF();
      pdf.setFontSize(14);
      pdf.text('Manual Invoice', 15, 20);
      pdf.setFontSize(11);
      pdf.text(`Invoice Number: ${invoice.number}`, 15, 32);
      pdf.text(`Tenant: ${tenant?.tenantName || '-'}`, 15, 40);
      pdf.text(`Amount: Ksh ${invoice.amount.toLocaleString()}`, 15, 48);
      pdf.text(`Status: ${invoice.status}`, 15, 56);
      pdf.text(`Created: ${formatDate(invoice.createdAt)}`, 15, 64);
      pdf.text(`Due Date: ${formatDate(invoice.dueDate)}`, 15, 72);
      pdf.text(`Paid At: ${formatDate(invoice.paidAt)}`, 15, 80);
      pdf.text(`Reference: ${invoice.linkedReferenceCode || '-'}`, 15, 88);

      const invoicePdfBlob = pdf.output('blob');

      const zip = new JSZip();
      zip.file(`${invoice.number}.pdf`, invoicePdfBlob);

      if (invoice.linkedReceiptUrl) {
        const receiptUrl = getFullAssetUrl(invoice.linkedReceiptUrl);
        const receiptRes = await fetch(receiptUrl, {
          credentials: 'include',
        });
        if (receiptRes.ok) {
          const receiptBlob = await receiptRes.blob();
          const contentType = receiptBlob.type || '';
          const ext = contentType.includes('pdf')
            ? 'pdf'
            : contentType.includes('png')
              ? 'png'
              : contentType.includes('jpeg') || contentType.includes('jpg')
                ? 'jpg'
                : 'bin';
          zip.file(`receipt-${invoice.number}.${ext}`, receiptBlob);
        }
      }

      const bundleBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(bundleBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.number}-bundle.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download invoice bundle');
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

        {needsInitialPlan && (
          <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs font-semibold text-amber-900">No existing subscription</div>
            <div className="mt-1 text-xs text-amber-800">
              Assign an initial plan first, or choose one in Manual Renew.
            </div>

            <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
              <select
                value={initialPlanId}
                onChange={(e) => setInitialPlanId(e.target.value)}
                className="w-full rounded border border-amber-300 px-3 py-2 text-sm md:max-w-sm"
              >
                <option value="">Select initial plan</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                    {plan.interval ? ` (${plan.interval})` : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={assignInitialPlan}
                disabled={assigningInitialPlan || plansLoading}
                className="rounded border border-amber-300 bg-white px-3 py-2 text-xs text-amber-900 hover:bg-amber-100 disabled:opacity-50"
              >
                {assigningInitialPlan ? 'Assigning...' : 'Assign Initial Plan'}
              </button>

              {plansLoading && <span className="text-xs text-amber-800">Loading plans...</span>}
            </div>
          </div>
        )}

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
                    <div>{payment.appliedToSubscription ? 'applied' : payment.status}</div>
                    {payment.receiptUploadFailed && (
                      <div className="text-[11px] text-red-600">receipt_upload_failed</div>
                    )}
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

      <div className="rounded border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Manual Invoice Lifecycle</h2>
        <p className="text-xs text-gray-500">
          Manage manual invoices through draft, issued, paid, and void states.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            type="number"
            value={invoiceAmount}
            onChange={(e) => setInvoiceAmount(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
            placeholder="Invoice amount"
          />
          <input
            type="date"
            value={invoiceDueDate}
            onChange={(e) => setInvoiceDueDate(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          />
          <select
            value={invoiceStatus}
            onChange={(e) => setInvoiceStatus(e.target.value as 'draft' | 'issued' | 'paid' | 'void')}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="draft">draft</option>
            <option value="issued">issued</option>
            <option value="paid">paid</option>
            <option value="void">void</option>
          </select>
          <input
            value={invoiceNotes}
            onChange={(e) => setInvoiceNotes(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
            placeholder="Notes"
          />
        </div>

        <div className="mt-3">
          <button
            onClick={createManualInvoice}
            disabled={submittingInvoice}
            className="inline-flex items-center rounded bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black disabled:opacity-50"
          >
            {submittingInvoice ? 'Creating...' : 'Create Manual Invoice'}
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded border">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-2 py-2 text-left">Invoice</th>
                <th className="px-2 py-2 text-left">Amount</th>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2 text-left">Due/Paid</th>
                <th className="px-2 py-2 text-left">Linked Payment</th>
                <th className="px-2 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t">
                  <td className="px-2 py-2">
                    <div className="font-medium">{invoice.number}</div>
                    <div className="text-gray-500">{formatDate(invoice.createdAt)}</div>
                  </td>
                  <td className="px-2 py-2">{invoice.amount.toLocaleString()}</td>
                  <td className="px-2 py-2">{invoice.status}</td>
                  <td className="px-2 py-2">
                    <div>Due: {formatDate(invoice.dueDate)}</div>
                    <div className="text-gray-500">Paid: {formatDate(invoice.paidAt)}</div>
                  </td>
                  <td className="px-2 py-2">
                    {invoice.linkedPaymentId ? (
                      <>
                        <div>{invoice.linkedPaymentAmount?.toLocaleString() || 0}</div>
                        <div className="text-gray-500">{invoice.linkedPaymentStatus || '-'}</div>
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => transitionInvoiceStatus(invoice, 'issued')}
                          disabled={invoiceActionLoading === invoice.id}
                          className="rounded border px-2 py-1 text-[11px] bg-blue-50 text-blue-700"
                        >
                          Issue
                        </button>
                      )}
                      {(invoice.status === 'draft' || invoice.status === 'issued') && (
                        <button
                          onClick={() => transitionInvoiceStatus(invoice, 'paid')}
                          disabled={invoiceActionLoading === invoice.id}
                          className="rounded border px-2 py-1 text-[11px] bg-green-50 text-green-700"
                        >
                          Mark Paid
                        </button>
                      )}
                      {invoice.status !== 'void' && (
                        <button
                          onClick={() => transitionInvoiceStatus(invoice, 'void')}
                          disabled={invoiceActionLoading === invoice.id}
                          className="rounded border px-2 py-1 text-[11px] bg-red-50 text-red-700"
                        >
                          Void
                        </button>
                      )}
                      <button
                        onClick={() => downloadInvoiceBundle(invoice)}
                        className="rounded border px-2 py-1 text-[11px] bg-gray-50 text-gray-700"
                      >
                        Download Bundle
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!invoices.length && (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-center text-gray-500">
                    No manual invoices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
                <>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={actionMonths}
                    onChange={(e) => setActionMonths(Number(e.target.value || 0))}
                    className="w-full rounded border px-3 py-2 text-sm"
                    placeholder="Renew months"
                  />

                  {(tenant.billingState === 'no_subscription' || !tenant.subscriptionId) && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Select plan for initial subscription
                      </label>
                      <select
                        value={actionPlanId}
                        onChange={(e) => setActionPlanId(e.target.value)}
                        className="w-full rounded border px-3 py-2 text-sm"
                      >
                        <option value="">Choose a plan</option>
                        {plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                            {plan.interval ? ` (${plan.interval})` : ''}
                          </option>
                        ))}
                      </select>
                      {plansLoading && (
                        <div className="mt-1 text-xs text-gray-500">Loading plans...</div>
                      )}
                    </div>
                  )}
                </>
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
