'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import SubscriptionDetailsModal from '@/components/SubscriptionDetailsModal';
import AssignPlanModal from '@/components/AssignPlanModal';
import { apiGet } from '@/utils/api';

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
      const data = await apiGet<Subscription[]>('/admin/subscriptions');
      setSubscriptions(data);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Subscription Management</h1>
              <p className="mt-2 text-lg text-gray-600">Manage tenant subscriptions and scheduled changes</p>
            </div>
            <Button
              onClick={() => setAssignModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Assign Plan to Tenant
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="text-lg text-gray-600">Loading subscriptions...</span>
            </div>
          </div>
        ) : (
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="text-2xl font-bold">All Subscriptions</CardTitle>
              <p className="text-indigo-100 mt-1">Overview of all tenant subscriptions</p>
            </CardHeader>
            <CardContent className="p-0">
              {subscriptions.length === 0 ? (
                <div className="text-center py-16">
                  <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No subscriptions found</h3>
                  <p className="mt-2 text-gray-500">Get started by assigning a plan to a tenant.</p>
                  <Button
                    onClick={() => setAssignModalOpen(true)}
                    className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                  >
                    Assign First Plan
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableHead className="font-semibold text-gray-700 py-4">Tenant</TableHead>
                        <TableHead className="font-semibold text-gray-700">Plan</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700">Current Period</TableHead>
                        <TableHead className="font-semibold text-gray-700">Scheduled Change</TableHead>
                        <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.map((subscription) => (
                        <TableRow key={subscription.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <TableCell className="py-4">
                            <div className="flex items-center space-x-3">
                              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-indigo-700">
                                  {subscription.Tenant.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{subscription.Tenant.name}</div>
                                <div className="text-sm text-gray-500">{subscription.Tenant.contactEmail}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{subscription.Plan.name}</div>
                                <div className="text-sm text-gray-500">${subscription.Plan.price}/month</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {format(new Date(subscription.currentPeriodStart), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-gray-500">
                                to {format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {subscription.scheduledPlan && subscription.scheduledEffectiveDate ? (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="text-sm">
                                  <div className="font-medium text-yellow-800">{subscription.scheduledPlan.name}</div>
                                  <div className="text-yellow-600">
                                    Effective: {format(new Date(subscription.scheduledEffectiveDate), 'MMM dd, yyyy')}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(subscription.id)}
                              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

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
