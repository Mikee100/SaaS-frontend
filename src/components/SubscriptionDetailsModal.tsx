'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

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
  };
  scheduledPlan?: {
    id: string;
    name: string;
    price: number;
  };
  Tenant: {
    id: string;
    name: string;
    contactEmail: string;
    users: Array<{
      id: string;
      name: string;
      email: string;
    }>;
  };
  Invoice: Array<{
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
  onCancelScheduled: (subscriptionId: string) => void;
}

export default function SubscriptionDetailsModal({
  subscriptionId,
  isOpen,
  onClose,
  onCancelScheduled,
}: SubscriptionDetailsModalProps) {
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

  // Fetch subscription details
  useEffect(() => {
    if (subscriptionId && isOpen) {
      const fetchSubscription = async () => {
        try {
          const res = await fetch(`/api/admin/subscriptions/${subscriptionId}`);
          if (res.ok) {
            const data = await res.json();
            setSubscription(data);
          }
        } catch (error) {
          console.error('Failed to fetch subscription details:', error);
        }
      };
      fetchSubscription();
    }
  }, [subscriptionId, isOpen]);

  // Fetch usage after subscription is loaded
  useEffect(() => {
    if (subscription?.Tenant.id) {
      const fetchUsage = async () => {
        try {
          const res = await fetch(`/api/admin/subscriptions/tenant/${subscription.Tenant.id}/usage`);
          if (res.ok) {
            const data = await res.json();
            setUsage(data);
          }
        } catch (error) {
          console.error('Failed to fetch usage:', error);
        }
      };
      fetchUsage();
    }
  }, [subscription?.Tenant.id]);

  const handleCancelScheduled = async () => {
    if (!subscription) return;

    try {
      const response = await fetch(`/api/admin/subscriptions/${subscription.id}/cancel-scheduled`, {
        method: 'PATCH',
      });

      if (response.ok) {
        await fetchSubscriptionDetails(); // Refresh data
        onCancelScheduled(subscription.id);
      }
    } catch (error) {
      console.error('Failed to cancel scheduled change:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      canceled: 'destructive',
      past_due: 'destructive',
      incomplete: 'secondary',
    } as const;

    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  if (!subscription) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subscription Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tenant</label>
                  <p className="text-lg">{subscription.Tenant.name}</p>
                  <p className="text-sm text-muted-foreground">{subscription.Tenant.contactEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">{getStatusBadge(subscription.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Current Plan</label>
                  <p className="text-lg">{subscription.Plan.name}</p>
                  <p className="text-sm text-muted-foreground">${subscription.Plan.price}/month</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Current Period</label>
                  <p className="text-sm">
                    {format(new Date(subscription.currentPeriodStart), 'MMM dd, yyyy')} - {format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Limits & Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Limits & Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{usage?.userCount || 0}</div>
                  <div className="text-sm text-muted-foreground">
                    Users {subscription.Plan.maxUsers ? ` / ${subscription.Plan.maxUsers}` : ''}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{usage?.productCount || 0}</div>
                  <div className="text-sm text-muted-foreground">
                    Products {subscription.Plan.maxProducts ? ` / ${subscription.Plan.maxProducts}` : ''}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{usage?.salesCount || 0}</div>
                  <div className="text-sm text-muted-foreground">
                    Sales {subscription.Plan.maxSalesPerMonth ? ` / ${subscription.Plan.maxSalesPerMonth}/month` : ''}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scheduled Changes */}
          {subscription.scheduledPlan && subscription.scheduledEffectiveDate && (
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Changes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Downgrade to {subscription.scheduledPlan.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Effective: {format(new Date(subscription.scheduledEffectiveDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleCancelScheduled}>
                    Cancel Scheduled Change
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {subscription.Invoice.slice(0, 3).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium">${invoice.amount}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(invoice.createdAt), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                      {invoice.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function fetchSubscriptionDetails() {
  throw new Error('Function not implemented.');
}

