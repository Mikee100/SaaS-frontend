'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { apiGet, apiPatch } from '@/utils/api';

interface SubscriptionDetails {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  scheduledEffectiveDate?: string;
  Plan: {
    id: string;
    name: string;
    price: number;
    maxUsers?: number;
    maxProducts?: number;
    maxSalesPerMonth?: number;
    interval?: string;
  };
  scheduledPlan?: {
    id: string;
    name: string;
    price: number;
  } | null;
  Tenant: {
    id: string;
    name: string;
    contactEmail: string;
    users?: Array<{
      id: string;
      name: string;
      email: string;
    }>;
  };
  Invoice?: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
}

interface Usage {
  userCount?: number;
  productCount?: number;
  salesCount?: number;
}

interface SubscriptionDetailsModalProps {
  subscriptionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelScheduled: () => void;
}

export default function SubscriptionDetailsModal({
  subscriptionId,
  isOpen,
  onClose,
  onCancelScheduled,
}: SubscriptionDetailsModalProps) {
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSubscriptionDetails = useCallback(async () => {
    if (!subscriptionId || !isOpen) return;
    setLoading(true);
    try {
      const data = await apiGet<SubscriptionDetails>(`/admin/subscriptions/${subscriptionId}`);
      setSubscription(data);
    } catch (error) {
      console.error('Failed to fetch subscription details:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [subscriptionId, isOpen]);

  useEffect(() => {
    if (subscriptionId && isOpen) {
      fetchSubscriptionDetails();
    } else {
      setSubscription(null);
      setUsage(null);
    }
  }, [subscriptionId, isOpen, fetchSubscriptionDetails]);

  useEffect(() => {
    if (subscription?.Tenant?.id) {
      apiGet<Usage>(`/admin/subscriptions/tenant/${subscription.Tenant.id}/usage`)
        .then(setUsage)
        .catch(() => setUsage(null));
    } else {
      setUsage(null);
    }
  }, [subscription?.Tenant?.id]);

  const handleCancelScheduled = async () => {
    if (!subscription) return;
    try {
      await apiPatch(`/admin/subscriptions/${subscription.id}/cancel-scheduled`);
      await fetchSubscriptionDetails();
      onCancelScheduled();
    } catch (error) {
      console.error('Failed to cancel scheduled change:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-800',
      canceled: 'bg-red-100 text-red-800',
      past_due: 'bg-amber-100 text-amber-800',
      incomplete: 'bg-slate-100 text-slate-600',
      trialing: 'bg-blue-100 text-blue-800',
    };
    const c = variants[status] || 'bg-slate-100 text-slate-600';
    return <Badge className={c}>{status}</Badge>;
  };

  const invoices = subscription?.Invoice ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subscription Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading...</div>
        ) : !subscription ? (
          <div className="py-12 text-center text-gray-500">Subscription not found.</div>
        ) : (
          <div className="space-y-4">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Tenant</p>
                    <p className="font-medium">{subscription.Tenant.name}</p>
                    <p className="text-sm text-gray-500">{subscription.Tenant.contactEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="mt-1">{getStatusBadge(subscription.status)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Current Plan</p>
                    <p className="font-medium">{subscription.Plan.name}</p>
                    <p className="text-sm text-gray-500">
                      Ksh {subscription.Plan.price.toLocaleString('en-KE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      /{subscription.Plan.interval === 'yearly' ? 'yr' : 'mo'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Current Period</p>
                    <p className="text-sm">
                      {format(new Date(subscription.currentPeriodStart), 'MMM d, yyyy')} – {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plan Limits & Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plan Limits & Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xl font-semibold">{usage?.userCount ?? 0}</div>
                    <div className="text-sm text-gray-500">Users{subscription.Plan.maxUsers != null ? ` / ${subscription.Plan.maxUsers}` : ''}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xl font-semibold">{usage?.productCount ?? 0}</div>
                    <div className="text-sm text-gray-500">Products{subscription.Plan.maxProducts != null ? ` / ${subscription.Plan.maxProducts}` : ''}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xl font-semibold">{usage?.salesCount ?? 0}</div>
                    <div className="text-sm text-gray-500">Sales{subscription.Plan.maxSalesPerMonth != null ? ` / ${subscription.Plan.maxSalesPerMonth}/mo` : ''}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scheduled Changes */}
            {subscription.scheduledPlan && subscription.scheduledEffectiveDate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Scheduled Changes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Change to {subscription.scheduledPlan.name}</p>
                      <p className="text-sm text-gray-500">Effective: {format(new Date(subscription.scheduledEffectiveDate!), 'MMM d, yyyy')}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleCancelScheduled}>
                      Cancel Scheduled Change
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Invoices */}
            {invoices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {invoices.slice(0, 5).map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="font-medium">Ksh {inv.amount}</p>
                          <p className="text-sm text-gray-500">{format(new Date(inv.createdAt), 'MMM d, yyyy')}</p>
                        </div>
                        <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'}>{inv.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
