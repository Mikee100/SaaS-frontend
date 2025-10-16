'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, Users, Package, Building, ShoppingCart, AlertTriangle } from 'lucide-react';
import { apiGet, apiPost } from '@/utils/api';

interface Tenant {
  id: string;
  name: string;
  contactEmail: string;
  createdAt: string;
}

interface TrialStatus {
  isTrial: boolean;
  trialExpired: boolean;
  trialEnd?: string;
  remainingTime?: number;
}

interface TrialUsageData {
  isTrial: boolean;
  trialStart?: string;
  trialEnd?: string;
  daysRemaining?: number;
  usage?: {
    users: {
      current: number;
      limit: number;
      percentage: number;
      approachingLimit: boolean;
    };
    products: {
      current: number;
      limit: number;
      percentage: number;
      approachingLimit: boolean;
    };
    branches: {
      current: number;
      limit: number;
      percentage: number;
      approachingLimit: boolean;
    };
    salesThisMonth: {
      current: number;
      limit: number;
      percentage: number;
      approachingLimit: boolean;
    };
  };
  planName?: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
}

export default function TrialManagementPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [durationHours, setDurationHours] = useState<string>('24');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [trialStatuses, setTrialStatuses] = useState<Record<string, TrialStatus>>({});
  const [trialUsages, setTrialUsages] = useState<Record<string, TrialUsageData>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedTenantForUsage, setSelectedTenantForUsage] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    try {
      const data = await apiGet<Tenant[]>('/admin/tenants');
      setTenants(data);
      // Fetch trial status for each tenant
      data.forEach((tenant: Tenant) => fetchTrialStatus(tenant.id));
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const data = await apiGet<Plan[]>('/billing/plans');
      setPlans(data);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
    fetchPlans();
  }, [fetchTenants, fetchPlans]);

  const fetchTrialStatus = async (tenantId: string) => {
    try {
      const status = await apiGet<TrialStatus>(`/admin/trials/${tenantId}`);
      setTrialStatuses(prev => ({ ...prev, [tenantId]: status }));
    } catch (error) {
      console.error('Error fetching trial status:', error);
    }
  };

  const fetchTrialUsage = async (tenantId: string) => {
    try {
      const usage = await apiGet<TrialUsageData>(`/usage/trial?tenantId=${tenantId}`);
      setTrialUsages(prev => ({ ...prev, [tenantId]: usage }));
    } catch (error) {
      console.error('Error fetching trial usage:', error);
    }
  };

  const viewTrialUsage = (tenantId: string) => {
    setSelectedTenantForUsage(tenantId);
    fetchTrialUsage(tenantId);
  };

  const createTrial = async () => {
    if (!selectedTenant || !selectedPlan || !durationHours) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await apiPost('/admin/trials', {
        tenantId: selectedTenant,
        durationHours: parseInt(durationHours),
        planId: selectedPlan,
      });

      setMessage({ type: 'success', text: 'Trial created successfully!' });
      fetchTrialStatus(selectedTenant);
      setSelectedTenant('');
      setDurationHours('24');
      setSelectedPlan('');
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
      ) {
        setMessage({ type: 'error', text: (error as { message: string }).message });
      } else {
        setMessage({ type: 'error', text: 'Failed to create trial' });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getTrialStatusBadge = (status: TrialStatus) => {
    if (!status.isTrial) return <Badge variant="secondary">No Trial</Badge>;
    if (status.trialExpired) return <Badge variant="destructive">Expired</Badge>;
    return <Badge variant="default">Active</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Trial Management</h1>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create New Trial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="tenant">Select Tenant</Label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.contactEmail})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="plan">Select Plan</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} (${plan.price}/month)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">Duration (Hours)</Label>
              <Input
                id="duration"
                type="number"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                placeholder="24"
                min="1"
              />
            </div>
          </div>

          <Button onClick={createTrial} disabled={loading} className="w-full md:w-auto">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Trial
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Trial Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tenants.map((tenant) => {
              const status = trialStatuses[tenant.id];
              return (
                <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{tenant.name}</h3>
                    <p className="text-sm text-gray-600">{tenant.contactEmail}</p>
                    <p className="text-xs text-gray-500">
                      Created: {new Date(tenant.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center space-x-4">
                    {status && (
                      <div className="text-right">
                        {getTrialStatusBadge(status)}
                        {status.isTrial && !status.trialExpired && status.remainingTime && (
                          <div className="flex items-center text-sm text-green-600 mt-1">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatTimeRemaining(status.remainingTime)} remaining
                          </div>
                        )}
                        {status.trialEnd && (
                          <p className="text-xs text-gray-500">
                            Ends: {new Date(status.trialEnd).toLocaleString()}
                          </p>
                        )}
                        {status.isTrial && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewTrialUsage(tenant.id)}
                            className="mt-2"
                          >
                            View Usage
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Trial Usage Modal/Details */}
      {selectedTenantForUsage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Trial Usage Details
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTenantForUsage(null)}
              >
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const tenant = tenants.find(t => t.id === selectedTenantForUsage);
              const usage = trialUsages[selectedTenantForUsage];

              if (!usage || !usage.isTrial) {
                return (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No trial usage data available for {tenant?.name}</p>
                  </div>
                );
              }

              const getProgressColor = (percentage: number) => {
                if (percentage >= 90) return 'bg-red-500';
                if (percentage >= 80) return 'bg-yellow-500';
                if (percentage >= 70) return 'bg-orange-500';
                return 'bg-green-500';
              };

              const getUsageIcon = (type: string) => {
                switch (type) {
                  case 'users': return <Users className="w-5 h-5" />;
                  case 'products': return <Package className="w-5 h-5" />;
                  case 'branches': return <Building className="w-5 h-5" />;
                  case 'salesThisMonth': return <ShoppingCart className="w-5 h-5" />;
                  default: return null;
                }
              };

              const getUsageLabel = (type: string) => {
                switch (type) {
                  case 'users': return 'Users';
                  case 'products': return 'Products';
                  case 'branches': return 'Branches';
                  case 'salesThisMonth': return 'Sales This Month';
                  default: return type;
                }
              };

              return (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{tenant?.name}</h3>
                        <p className="text-sm text-gray-600">Plan: {usage.planName}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Trial Period</div>
                        <div className="text-lg font-semibold text-blue-600">
                          {usage.daysRemaining} days remaining
                        </div>
                        {usage.trialEnd && (
                          <div className="text-sm text-gray-500">
                            Ends on {new Date(usage.trialEnd).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Usage Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {usage.usage && Object.entries(usage.usage).map(([key, metric]) => (
                      <div key={key} className="bg-white border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className={`p-2 rounded-lg ${
                              metric.approachingLimit ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {getUsageIcon(key)}
                            </div>
                            <div>
                              <h4 className="text-sm font-medium">{getUsageLabel(key)}</h4>
                              <p className="text-xs text-gray-500">
                                {metric.current} / {metric.limit === 0 ? 'Unlimited' : metric.limit}
                              </p>
                            </div>
                          </div>
                          {metric.approachingLimit && (
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full ${getProgressColor(metric.percentage)}`}
                            style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                          ></div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-gray-600">
                          <span>{metric.percentage.toFixed(1)}% used</span>
                          {metric.approachingLimit && (
                            <span className="text-yellow-600 font-medium">Approaching limit</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Warnings */}
                  {usage.usage && Object.values(usage.usage).some(m => m.approachingLimit) && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Usage Warning:</strong> This tenant is approaching one or more usage limits.
                        Consider contacting them about upgrading their plan.
                        <ul className="mt-2 list-disc list-inside">
                      
{Object.entries(usage.usage)
  .filter(([, metric]) => metric.approachingLimit)
  .map(([key]) => (
    <li key={key}>{getUsageLabel(key)} usage is over 80%</li>
  ))}

                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
