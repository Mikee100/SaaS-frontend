"use client";
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import { FaChevronLeft } from 'react-icons/fa';

interface Tenant {
  id: string;
  tenantId?: string;
  clientName?: string;
  clientEmail?: string;
  plan?: {
    name?: string;
    price?: number;
    interval?: string;
    features?: {
      maxUsers?: number;
      maxProducts?: number;
      maxSalesPerMonth?: number;
      analyticsEnabled?: boolean;
      advancedReports?: boolean;
      prioritySupport?: boolean;
      customBranding?: boolean;
      apiAccess?: boolean;
    };
  };
  status?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  lastInvoice?: {
    amount: number;
    status: string;
    dueDate?: string;
    paidAt?: string;
  };
  lastPayment?: {
    amount: number;
    status: string;
    completedAt?: string;
  };
}

export default function TenantBillingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedParams(resolved);
    };
    resolveParams();
  }, [params]);

  const fetchTenant = useCallback(async () => {
    if (!resolvedParams) return;

    try {
      setLoading(true);
      setError('');
      const data = await apiGet(`/billing/admin/billing/tenants`);
      const found = Array.isArray(data) ? data.find((t: Tenant) => t.tenantId === resolvedParams.id) : null;
      setTenant(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenant');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams]);

  useEffect(() => {
    if (resolvedParams) {
      fetchTenant();
    }
  }, [resolvedParams, fetchTenant]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!tenant) return <div className="p-8">Tenant not found</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
        <FaChevronLeft className="mr-1" /> Back to Tenants
      </button>
      <h1 className="text-2xl font-bold mb-2">{tenant.clientName}</h1>
      <div className="mb-4 text-gray-500">{tenant.clientEmail}</div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Subscription Details</h2>
        <div className="mb-1"><span className="font-semibold">Plan:</span> {tenant.plan?.name || '-'}</div>
        <div className="mb-1"><span className="font-semibold">Price:</span> ${tenant.plan?.price || '-'} / {tenant.plan?.interval || '-'}</div>
        <div className="mb-1"><span className="font-semibold">Status:</span> {tenant.status || '-'}</div>
        <div className="mb-1"><span className="font-semibold">Next Billing:</span> {tenant.currentPeriodEnd ? new Date(tenant.currentPeriodEnd).toLocaleDateString() : '-'}</div>
        <div className="mb-1"><span className="font-semibold">Cancel At Period End:</span> {tenant.cancelAtPeriodEnd ? 'Yes' : 'No'}</div>
        <div className="mb-1"><span className="font-semibold">Max Users:</span> {tenant.plan?.features?.maxUsers ?? '-'}</div>
        <div className="mb-1"><span className="font-semibold">Max Products:</span> {tenant.plan?.features?.maxProducts ?? '-'}</div>
        <div className="mb-1"><span className="font-semibold">Max Sales/Month:</span> {tenant.plan?.features?.maxSalesPerMonth ?? '-'}</div>
        <div className="mb-1"><span className="font-semibold">Features:</span> {
          [
            tenant.plan?.features?.analyticsEnabled && 'Analytics',
            tenant.plan?.features?.advancedReports && 'Advanced Reports',
            tenant.plan?.features?.prioritySupport && 'Priority Support',
            tenant.plan?.features?.customBranding && 'Custom Branding',
            tenant.plan?.features?.apiAccess && 'API Access',
          ].filter(Boolean).join(', ') || 'Basic'
        }</div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Last Invoice</h2>
        {tenant.lastInvoice ? (
          <>
            <div className="mb-1"><span className="font-semibold">Amount:</span> ${tenant.lastInvoice.amount}</div>
            <div className="mb-1"><span className="font-semibold">Status:</span> {tenant.lastInvoice.status}</div>
            <div className="mb-1"><span className="font-semibold">Due Date:</span> {tenant.lastInvoice.dueDate ? new Date(tenant.lastInvoice.dueDate).toLocaleDateString() : '-'}</div>
            <div className="mb-1"><span className="font-semibold">Paid At:</span> {tenant.lastInvoice.paidAt ? new Date(tenant.lastInvoice.paidAt).toLocaleDateString() : '-'}</div>
          </>
        ) : <div>No invoice found.</div>}
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Last Payment</h2>
        {tenant.lastPayment ? (
          <>
            <div className="mb-1"><span className="font-semibold">Amount:</span> ${tenant.lastPayment.amount}</div>
            <div className="mb-1"><span className="font-semibold">Status:</span> {tenant.lastPayment.status}</div>
            <div className="mb-1"><span className="font-semibold">Completed At:</span> {tenant.lastPayment.completedAt ? new Date(tenant.lastPayment.completedAt).toLocaleDateString() : '-'}</div>
          </>
        ) : <div>No payment found.</div>}
      </div>
    </div>
  );
}
