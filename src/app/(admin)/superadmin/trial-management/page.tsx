'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
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
    <div className="container mx-auto px-2 py-4 space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Trial Management</h1>
          <p className="text-xs text-gray-500 mt-1">Manage and monitor tenant trial periods</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Shield className="w-3 h-3" />
          Admin Portal
        </div>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="animate-in fade-in duration-300 rounded-md px-2 py-1 text-xs">
          <AlertDescription className="flex items-center gap-1">
            {message.type === 'success' ? <Zap className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="bg-white border border-blue-100 rounded-md shadow-sm">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700">Tenants</p>
                <p className="text-lg font-bold text-blue-900">{stats.totalTenants}</p>
              </div>
              <Building className="w-5 h-5 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-green-100 rounded-md shadow-sm">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700">Active Trials</p>
                <p className="text-lg font-bold text-green-900">{stats.activeTrials}</p>
              </div>
              <Clock className="w-5 h-5 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-red-100 rounded-md shadow-sm">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-700">Expired</p>
                <p className="text-lg font-bold text-red-900">{stats.expiredTrials}</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-red-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-yellow-100 rounded-md shadow-sm">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-yellow-700">Near Limit</p>
                <p className="text-lg font-bold text-yellow-900">{stats.nearLimit}</p>
              </div>
              <BarChart3 className="w-5 h-5 text-yellow-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex rounded-md bg-gray-50 border border-gray-100">
          <TabsTrigger value="overview" className="flex items-center gap-1 px-2 py-1 text-xs">
            <Eye className="w-3 h-3" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-1 px-2 py-1 text-xs">
            <Plus className="w-3 h-3" />
            Create Trial
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-1 px-2 py-1 text-xs">
            <BarChart3 className="w-3 h-3" />
            Usage
          </TabsTrigger>
        </TabsList>

        {/* Create Trial Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card className="rounded-md border border-gray-100 shadow-sm">
            <CardHeader className="bg-gray-50 border-b px-3 py-2 rounded-t-md">
              <CardTitle className="flex items-center gap-1 text-base">
                <Zap className="w-4 h-4 text-purple-600" />
                New Trial
              </CardTitle>
              <CardDescription className="text-xs">
                Set up a trial period for a tenant
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
                <div className="space-y-2">
                  <Label htmlFor="tenant" className="text-xs font-medium flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    Tenant
                  </Label>
                  <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                    <SelectTrigger className="w-full h-8 text-xs bg-white border border-gray-200 rounded-md shadow-sm" />
                    <SelectContent className="bg-white rounded-md shadow-lg border border-gray-100 p-1 z-50">
                      {tenants.map((tenant) => (
                        <SelectItem 
                          key={tenant.id} 
                          value={tenant.id} 
                          className="text-xs px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer flex flex-col gap-0.5 transition-colors"
                        >
                          <span className="font-medium text-gray-900">{tenant.name}</span>
                          <span className="text-[10px] text-gray-400">{tenant.contactEmail}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan" className="text-xs font-medium flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    Plan
                  </Label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger className="w-full h-8 text-xs bg-white border border-gray-200 rounded-md shadow-sm" />
                    <SelectContent className="bg-white rounded-md shadow-lg border border-gray-100 p-1 z-50">
                      {plans.map((plan) => (
                        <SelectItem 
                          key={plan.id} 
                          value={plan.id} 
                          className="text-xs px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer flex justify-between items-center transition-colors"
                        >
                          <span className="text-gray-900">{plan.name}</span>
                          <Badge variant="outline" className="ml-2 text-[10px] bg-gray-100 border-gray-200">
                            Ksh {plan.price}/mo
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-xs font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Duration (h)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    placeholder="24"
                    min="1"
                    className="w-full h-8 text-xs"
                  />
                </div>
              </div>

              <Button 
                onClick={createTrial} 
                disabled={loading || !selectedTenant || !selectedPlan || !durationHours}
                className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-md text-xs px-3 py-1"
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Zap className="mr-1 h-3 w-3" />
                    Create Trial
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tenant Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="rounded-md border border-gray-100 shadow-sm">
            <CardHeader className="px-3 py-2">
              <CardTitle className="text-base">Tenant Trials</CardTitle>
              <CardDescription className="text-xs">
                Monitor trial status and expiration
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-2">
                {tenants.length === 0 ? (
                  <div className="text-center py-6">
                    <Building className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No tenants found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tenants.map((tenant) => {
                      const status = trialStatuses[tenant.id];
                      return (
                        <div
                          key={tenant.id}
                          className="flex items-center justify-between px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all duration-150 gap-2"
                          style={{
                            borderStyle: 'solid',
                            borderWidth: '1px',
                          }}
                        >
                          <div className="flex items-center space-x-2 flex-1">
                            <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center shadow">
                              <Building className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-0.5">
                                <h3 className="font-semibold text-gray-900 truncate text-sm">{tenant.name}</h3>
                                {status && getTrialStatusBadge(status)}
                              </div>
                              <p className="text-xs text-gray-500 truncate">{tenant.contactEmail}</p>
                              <p className="text-[10px] text-gray-400">
                                Created {new Date(tenant.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {status && status.isTrial && !status.trialExpired && status.remainingTime && (
                              <div className="text-right hidden sm:block">
                                <div className="flex items-center text-xs text-green-600 font-medium">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatTimeRemaining(status.remainingTime)}
                                </div>
                                {status.trialEnd && (
                                  <p className="text-[10px] text-gray-400">
                                    Until {new Date(status.trialEnd).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs px-2 py-1"
                              onClick={() => viewTrialUsage(tenant.id)}
                              disabled={!status?.isTrial}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Usage
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Analytics Tab */}
        <TabsContent value="usage" className="space-y-4">
          {selectedTenantForUsage ? (
            <Card className="rounded-md border border-gray-100 shadow-sm">
              <CardHeader className="bg-gray-50 border-b px-3 py-2 rounded-t-md">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-1 text-base">
                      <BarChart3 className="w-4 h-4 text-green-600" />
                      Usage Analytics
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {tenants.find(t => t.id === selectedTenantForUsage)?.name}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-1"
                    onClick={() => setSelectedTenantForUsage(null)}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                {(() => {
                  const tenant = tenants.find(t => t.id === selectedTenantForUsage);
                  const usage = trialUsages[selectedTenantForUsage];

                  if (!usage) {
                    return (
                      <div className="text-center py-6">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-300" />
                        <p className="text-xs text-gray-400">Loading usage data...</p>
                      </div>
                    );
                  }

                  if (!usage.isTrial) {
                    return (
                      <div className="text-center py-6">
                        <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">No active trial for {tenant?.name}</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {/* Trial Header */}
                      <div className="bg-white border rounded-md p-3 shadow-sm">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                          <div>
                            <h3 className="text-base font-semibold text-gray-900">{tenant?.name}</h3>
                            <p className="text-xs text-gray-500">Plan: <Badge variant="secondary" className="text-[10px]">{usage.planName}</Badge></p>
                          </div>
                          <div className="text-center lg:text-right">
                            <div className="text-xl font-bold text-blue-600">{usage.daysRemaining}</div>
                            <div className="text-xs text-gray-400">days left</div>
                            {usage.trialEnd && (
                              <div className="text-[10px] text-gray-400 mt-1">
                                Ends {new Date(usage.trialEnd).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Usage Metrics Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {usage.usage && Object.entries(usage.usage).map(([key, metric]) => (
                          <Card key={key} className={`border-l-2 ${
                            metric.approachingLimit ? 'border-l-yellow-400' : 'border-l-blue-400'
                          } rounded-md shadow-sm`}>
                            <CardContent className="p-2">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className={`p-1 rounded-md ${
                                    metric.approachingLimit ? 'bg-yellow-50 text-yellow-600' : 'bg-blue-50 text-blue-600'
                                  }`}>
                                    {getUsageIcon(key)}
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900 text-xs">{getUsageLabel(key)}</h4>
                                    <p className="text-[10px] text-gray-400">
                                      {metric.current} / {metric.limit === 0 ? '∞' : metric.limit}
                                    </p>
                                  </div>
                                </div>
                                {metric.approachingLimit && (
                                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                )}
                              </div>

                              <Progress 
                                value={metric.percentage} 
                                className={`h-1 ${
                                  metric.approachingLimit ? 'bg-yellow-50' : 'bg-gray-100'
                                }`}
                              />
                              
                              <div className="flex justify-between items-center mt-1 text-[10px]">
                                <span className="text-gray-500">{metric.percentage.toFixed(1)}% used</span>
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
                        <Alert className="bg-yellow-50 border-yellow-100 rounded-md px-2 py-1 text-xs mt-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-600" />
                          <AlertDescription className="text-yellow-800">
                            <strong>Usage Alert:</strong> Approaching limits.
                            <ul className="mt-1 space-y-0.5">
                              {Object.entries(usage.usage!)
                                .filter(([, metric]) => metric.approachingLimit)
                                .map(([key]) => (
                                  <li key={key} className="flex items-center gap-1">
                                    <div className="w-1 h-1 bg-yellow-600 rounded-full" />
                                    {getUsageLabel(key)} &gt; 80%
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
            <Card className="rounded-md border border-gray-100 shadow-sm">
              <CardContent className="p-6 text-center">
                <BarChart3 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <h3 className="text-base font-semibold text-gray-900 mb-1">No Tenant Selected</h3>
                <p className="text-xs text-gray-400 mb-2">
                  Select a tenant from overview to view usage analytics
                </p>
                <Button onClick={() => setActiveTab('overview')} className="text-xs px-2 py-1">
                  <Eye className="w-3 h-3 mr-1" />
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