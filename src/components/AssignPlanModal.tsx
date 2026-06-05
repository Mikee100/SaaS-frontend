'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError, apiGet, apiPost } from '@/utils/api';
import { toast } from 'react-hot-toast';

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  interval?: string;
}

interface Tenant {
  id: string;
  name: string;
  contactEmail: string;
}

interface AssignPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignPlanModal({ isOpen, onClose, onSuccess }: AssignPlanModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const formatPrice = (amount: number) =>
    amount.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setFetching(true);
    try {
      const [plansRes, tenantsRes] = await Promise.all([
        apiGet('/admin/plans'),
        apiGet('/admin/tenants')
      ]);

      if (plansRes) setPlans(plansRes as Plan[]);
      if (tenantsRes) setTenants(tenantsRes as Tenant[]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load plans and tenants');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTenantId || !selectedPlanId) {
      toast.error('Please select both tenant and plan');
      return;
    }

    setLoading(true);
    try {
      let response: unknown;

      try {
        response = await apiPost(
          `/admin/subscriptions/operations/tenants/${selectedTenantId}/manual-renewal`,
          {
            months: 1,
            reason: 'Plan assignment from superadmin modal',
            planId: selectedPlanId,
          },
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          response = await apiPost('/billing/superadmin/assign-subscription', {
            tenantId: selectedTenantId,
            planId: selectedPlanId,
          });
        } else {
          throw error;
        }
      }

      if (response) {
        toast.success('Plan assigned successfully');
        onSuccess();
        onClose();
        // Reset form
        setSelectedTenantId('');
        setSelectedPlanId('');
      } else {
        toast.error('Failed to assign plan');
      }
    } catch (error) {
      console.error('Error assigning plan:', error);
      toast.error('Failed to assign plan');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedTenantId('');
    setSelectedPlanId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-linear-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-xl">
            <h2 className="text-2xl font-bold text-center">Assign Plan to Tenant</h2>
            <p className="text-indigo-100 text-center mt-2">
              Select a tenant and assign a subscription plan to them
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {fetching ? (
              <div className="py-12 text-center">
                <div className="inline-flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  <span className="text-gray-600">Loading data...</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tenant Selection */}
                <div className="space-y-3">
                  <label htmlFor="tenant-select" className="text-sm font-semibold text-gray-700 block">
                    Select Tenant
                  </label>
                  <select
                    id="tenant-select"
                    value={selectedTenantId}
                    onChange={(e) => {
                      console.log('Tenant selected:', e.target.value);
                      setSelectedTenantId(e.target.value);
                    }}
                    className="w-full h-12 px-4 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 bg-white text-gray-900"
                    required
                  >
                    <option value="">Choose a tenant from the list</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.contactEmail})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Plan Selection */}
                <div className="space-y-3">
                  <label htmlFor="plan-select" className="text-sm font-semibold text-gray-700 block">
                    Select Plan
                  </label>
                  <select
                    id="plan-select"
                    value={selectedPlanId}
                    onChange={(e) => {
                      console.log('Plan selected:', e.target.value);
                      setSelectedPlanId(e.target.value);
                    }}
                    className="w-full h-12 px-4 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 bg-white text-gray-900"
                    required
                  >
                    <option value="">Choose a subscription plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - Ksh {formatPrice(plan.price)}/{plan.interval === 'yearly' ? 'yr' : 'mo'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assignment Summary */}
                {selectedTenantId && selectedPlanId && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="font-semibold text-indigo-900 mb-2">Assignment Summary</h4>
                    <div className="text-sm text-indigo-700 space-y-1">
                      <p><strong>Tenant:</strong> {tenants.find(t => t.id === selectedTenantId)?.name}</p>
                      <p><strong>Email:</strong> {tenants.find(t => t.id === selectedTenantId)?.contactEmail}</p>
                      <p><strong>Plan:</strong> {plans.find(p => p.id === selectedPlanId)?.name}</p>
                      <p><strong>Price:</strong> Ksh {formatPrice(plans.find(p => p.id === selectedPlanId)?.price || 0)}/{plans.find(p => p.id === selectedPlanId)?.interval === 'yearly' ? 'yr' : 'mo'}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="px-6 py-2 h-11 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !selectedTenantId || !selectedPlanId}
                    className="px-6 py-2 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Assigning Plan...</span>
                      </div>
                    ) : (
                      'Assign Plan'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
