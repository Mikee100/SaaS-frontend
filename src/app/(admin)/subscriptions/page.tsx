'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { format } from 'date-fns';
import SubscriptionDetailsModal from '../../../components/SubscriptionDetailsModal';
import AssignPlanModal from '../../../components/AssignPlanModal';

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  scheduledEffectiveDate?: string;
  Plan: {
    name: string;
    price: number;
  };
  scheduledPlan?: {
    name: string;
  };
  Tenant: {
    name: string;
    contactEmail: string;
  };
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/subscriptions', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data);
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (subscriptionId: string) => {
    setSelectedSubscriptionId(subscriptionId);
    setModalOpen(true);
  };


  const handleCancelScheduled = () => {
    // Refresh the subscriptions list
    fetchSubscriptions();
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

  if (loading) {
    return <div className="p-6">Loading subscriptions...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Subscription Management</h1>
          <p className="text-muted-foreground">Manage tenant subscriptions and scheduled changes</p>
        </div>
        <Button onClick={() => setAssignModalOpen(true)}>
          Assign Plan to Tenant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Period</TableHead>
                <TableHead>Scheduled Change</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{subscription.Tenant.name}</div>
                      <div className="text-sm text-muted-foreground">{subscription.Tenant.contactEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{subscription.Plan.name}</div>
                      <div className="text-sm text-muted-foreground">${subscription.Plan.price}/month</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{format(new Date(subscription.currentPeriodStart), 'MMM dd, yyyy')}</div>
                      <div className="text-muted-foreground">to {format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {subscription.scheduledPlan && subscription.scheduledEffectiveDate ? (
                      <div className="text-sm">
                        <div className="font-medium">{subscription.scheduledPlan.name}</div>
                        <div className="text-muted-foreground">
                          Effective: {format(new Date(subscription.scheduledEffectiveDate), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(subscription.id)}>
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SubscriptionDetailsModal
        subscriptionId={selectedSubscriptionId}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCancelScheduled={handleCancelScheduled}
      />

      <AssignPlanModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onSuccess={fetchSubscriptions}
      />
    </div>
  );
}
