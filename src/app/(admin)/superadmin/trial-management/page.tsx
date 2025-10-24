'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Progress } from '@/components/ui/progress';
import { 
  Loader2, Clock, Users, Package, Building, ShoppingCart, 
  AlertTriangle, Plus, Eye, X, Calendar, CreditCard,
  Zap, BarChart3, Shield
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('overview');

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
    setActiveTab('usage');
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
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const getTrialStatusBadge = (status: TrialStatus) => {
    if (!status.isTrial) return <Badge variant="outline" className="bg-gray-50 text-gray-700">No Trial</Badge>;
    if (status.trialExpired) return <Badge variant="destructive">Expired</Badge>;
    return <Badge className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
  };

  const getUsageIcon = (type: string) => {
    switch (type) {
      case 'users': return <Users className="w-4 h-4" />;
      case 'products': return <Package className="w-4 h-4" />;
      case 'branches': return <Building className="w-4 h-4" />;
      case 'salesThisMonth': return <ShoppingCart className="w-4 h-4" />;
      default: return null;
    }
  };

  const getUsageLabel = (type: string) => {
    switch (type) {
      case 'users': return 'Users';
      case 'products': return 'Products';
      case 'branches': return 'Branches';
      case 'salesThisMonth': return 'Monthly Sales';
      default: return type;
    }
  };

  const stats = {
    totalTenants: tenants.length,
    activeTrials: Object.values(trialStatuses).filter(status => status.isTrial && !status.trialExpired).length,
    expiredTrials: Object.values(trialStatuses).filter(status => status.trialExpired).length,
    nearLimit: selectedTenantForUsage && trialUsages[selectedTenantForUsage]?.usage 
      ? Object.values(trialUsages[selectedTenantForUsage].usage!).filter(metric => metric.approachingLimit).length
      : 0
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trial Management</h1>
          <p className="text-gray-600 mt-2">Manage and monitor tenant trial periods</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Shield className="w-4 h-4" />
          Admin Portal
        </div>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="animate-in fade-in duration-300">
          <AlertDescription className="flex items-center gap-2">
            {message.type === 'success' ? <Zap className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Tenants</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalTenants}</p>
              </div>
              <Building className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Active Trials</p>
                <p className="text-2xl font-bold text-green-900">{stats.activeTrials}</p>
              </div>
              <Clock className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Expired Trials</p>
                <p className="text-2xl font-bold text-red-900">{stats.expiredTrials}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Near Limit</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.nearLimit}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-yellow-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Tenant Overview
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Trial
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Usage Analytics
          </TabsTrigger>
        </TabsList>

        {/* Create Trial Tab */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Zap className="w-5 h-5 text-purple-600" />
                Create New Trial
              </CardTitle>
              <CardDescription>
                Set up a trial period for a tenant with specific plan and duration
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="space-y-3">
                  <Label htmlFor="tenant" className="text-sm font-medium flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Select Tenant
                  </Label>
                  <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose tenant..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{tenant.name}</span>
                            <span className="text-xs text-gray-500">{tenant.contactEmail}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="plan" className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Select Plan
                  </Label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose plan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          <div className="flex justify-between items-center w-full">
                            <span>{plan.name}</span>
                            <Badge variant="outline" className="ml-2">
                              ${plan.price}/mo
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="duration" className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Duration (Hours)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    placeholder="24"
                    min="1"
                    className="w-full"
                  />
                </div>
              </div>

              <Button 
                onClick={createTrial} 
                disabled={loading || !selectedTenant || !selectedPlan || !durationHours}
                className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Trial...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Create Trial
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tenant Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Trial Status</CardTitle>
              <CardDescription>
                Monitor trial status and expiration dates for all tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tenants.length === 0 ? (
                  <div className="text-center py-8">
                    <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No tenants found</p>
                  </div>
                ) : (
                  tenants.map((tenant) => {
                    const status = trialStatuses[tenant.id];
                    return (
                      <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Building className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 truncate">{tenant.name}</h3>
                              {status && getTrialStatusBadge(status)}
                            </div>
                            <p className="text-sm text-gray-600 truncate">{tenant.contactEmail}</p>
                            <p className="text-xs text-gray-500">
                              Created {new Date(tenant.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          {status && status.isTrial && !status.trialExpired && status.remainingTime && (
                            <div className="text-right hidden sm:block">
                              <div className="flex items-center text-sm text-green-600 font-medium">
                                <Clock className="h-4 w-4 mr-1" />
                                {formatTimeRemaining(status.remainingTime)}
                              </div>
                              {status.trialEnd && (
                                <p className="text-xs text-gray-500">
                                  Until {new Date(status.trialEnd).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewTrialUsage(tenant.id)}
                            disabled={!status?.isTrial}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Usage
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Analytics Tab */}
        <TabsContent value="usage" className="space-y-6">
          {selectedTenantForUsage ? (
            <Card>
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-green-600" />
                      Trial Usage Analytics
                    </CardTitle>
                    <CardDescription>
                      Detailed usage metrics for {tenants.find(t => t.id === selectedTenantForUsage)?.name}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTenantForUsage(null)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {(() => {
                  const tenant = tenants.find(t => t.id === selectedTenantForUsage);
                  const usage = trialUsages[selectedTenantForUsage];

                  if (!usage) {
                    return (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500">Loading usage data...</p>
                      </div>
                    );
                  }

                  if (!usage.isTrial) {
                    return (
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No active trial for {tenant?.name}</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {/* Trial Header */}
                      <div className="bg-white border rounded-xl p-6 shadow-sm">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">{tenant?.name}</h3>
                            <p className="text-gray-600">Plan: <Badge variant="secondary">{usage.planName}</Badge></p>
                          </div>
                          <div className="text-center lg:text-right">
                            <div className="text-3xl font-bold text-blue-600">{usage.daysRemaining}</div>
                            <div className="text-sm text-gray-500">days remaining</div>
                            {usage.trialEnd && (
                              <div className="text-xs text-gray-400 mt-1">
                                Ends on {new Date(usage.trialEnd).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Usage Metrics Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {usage.usage && Object.entries(usage.usage).map(([key, metric]) => (
                          <Card key={key} className={`border-l-4 ${
                            metric.approachingLimit ? 'border-l-yellow-500' : 'border-l-blue-500'
                          }`}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className={`p-2 rounded-lg ${
                                    metric.approachingLimit ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
                                  }`}>
                                    {getUsageIcon(key)}
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{getUsageLabel(key)}</h4>
                                    <p className="text-sm text-gray-500">
                                      {metric.current} of {metric.limit === 0 ? 'Unlimited' : metric.limit}
                                    </p>
                                  </div>
                                </div>
                                {metric.approachingLimit && (
                                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                )}
                              </div>

                              <Progress 
                                value={metric.percentage} 
                                className={`h-2 ${
                                  metric.approachingLimit ? 'bg-yellow-100' : 'bg-gray-100'
                                }`}
                              />
                              
                              <div className="flex justify-between items-center mt-2 text-sm">
                                <span className="text-gray-600">{metric.percentage.toFixed(1)}% used</span>
                                {metric.approachingLimit && (
                                  <span className="text-yellow-600 font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Near limit
                                  </span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Usage Warnings */}
                      {usage.usage && Object.values(usage.usage).some(m => m.approachingLimit) && (
                        <Alert className="bg-yellow-50 border-yellow-200">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800">
                            <strong>Usage Alert:</strong> This tenant is approaching usage limits. 
                            Consider reaching out about plan upgrades.
                            <ul className="mt-2 space-y-1">
                              {Object.entries(usage.usage!)
                                .filter(([, metric]) => metric.approachingLimit)
                                .map(([key]) => (
                                  <li key={key} className="flex items-center gap-2">
                                    <div className="w-1 h-1 bg-yellow-600 rounded-full" />
                                    {getUsageLabel(key)} usage is over 80%
                                  </li>
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
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tenant Selected</h3>
                <p className="text-gray-500 mb-4">
                  Select a tenant from the overview tab to view detailed usage analytics
                </p>
                <Button onClick={() => setActiveTab('overview')}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Tenants
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}