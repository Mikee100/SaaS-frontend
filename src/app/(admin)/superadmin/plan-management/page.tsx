'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaUsers,
  FaBox,
  FaShoppingCart,
  FaCheck,
  FaTimes,
  FaSync,
  FaDollarSign,
  FaCalendarAlt,
} from 'react-icons/fa';

// Types
interface PlanFeature {
  id: string;
  key: string;
  name: string;
  description: string;
  isEnabled: boolean;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  maxUsers?: number;
  maxProducts?: number;
  maxSalesPerMonth?: number;
  maxBranches?: number;
  isActive: boolean;
  stripePriceId?: string;
  features: PlanFeature[];
  subscriptionCount: number;
}

interface PlanFormData {
  name: string;
  description: string;
  price: number;
  interval: string;
  maxUsers?: number;
  maxProducts?: number;
  maxSalesPerMonth?: number;
  maxBranches?: number;
  isActive: boolean;
  stripePriceId?: string;
  featureIds: string[];
}

// Main Component
export default function PlanManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>({
    name: '',
    description: '',
    price: 0,
    interval: 'monthly',
    maxUsers: undefined,
    maxProducts: undefined,
    maxSalesPerMonth: undefined,
    isActive: true,
    stripePriceId: '',
    featureIds: [],
  });

  useEffect(() => {
    fetchPlans();
    fetchFeatures();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/admin/plans');
      setPlans(data as Plan[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatures = async () => {
    try {
      const data = await apiGet('/admin/plan-features');
      setFeatures(data as PlanFeature[]);
    } catch (err) {
      console.error('Failed to load features:', err);
    }
  };

  const handleCreatePlan = async () => {
    try {
      await apiPost('/admin/plans', formData);
      setShowCreateModal(false);
      resetForm();
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;

    try {
      await apiPut(`/admin/plans/${editingPlan.id}`, formData);
      setEditingPlan(null);
      resetForm();
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      return;
    }

    try {
      await apiDelete(`/admin/plans/${planId}`);
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete plan');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      interval: 'monthly',
      maxUsers: undefined,
      maxProducts: undefined,
      maxSalesPerMonth: undefined,
      maxBranches: undefined,
      isActive: true,
      stripePriceId: '',
      featureIds: [],
    });
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      interval: plan.interval,
      maxUsers: plan.maxUsers,
      maxProducts: plan.maxProducts,
      maxSalesPerMonth: plan.maxSalesPerMonth,
      maxBranches: plan.maxBranches,
      isActive: plan.isActive,
      stripePriceId: plan.stripePriceId || '',
      featureIds: plan.features.map(f => f.id),
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Plan Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create and manage subscription plans with features and limits
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Action Bar */}
      <div className="mb-6 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {plans.length} plan{plans.length !== 1 ? 's' : ''} total
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchPlans}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FaSync className="mr-2 h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FaPlus className="mr-2 h-4 w-4" />
            Create Plan
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onEdit={() => openEditModal(plan)}
            onDelete={() => handleDeletePlan(plan.id)}
            formatCurrency={formatCurrency}
          />
        ))}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPlan) && (
        <PlanModal
          isOpen={true}
          isEditing={!!editingPlan}
          formData={formData}
          setFormData={setFormData}
          features={features}
          onSave={editingPlan ? handleUpdatePlan : handleCreatePlan}
          onCancel={() => {
            setShowCreateModal(false);
            setEditingPlan(null);
            resetForm();
          }}
        />
      )}
    </div>
  );
}

// Plan Card Component
function PlanCard({
  plan,
  onEdit,
  onDelete,
  formatCurrency
}: {
  plan: Plan;
  onEdit: () => void;
  onDelete: () => void;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            >
              <FaEdit className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            >
              <FaTrash className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-gray-600">
              <FaDollarSign className="h-4 w-4 mr-2" />
              <span className="text-sm">Price</span>
            </div>
            <span className="font-semibold text-lg">
              {formatCurrency(plan.price)}/{plan.interval}
            </span>
          </div>

          {plan.maxUsers && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600">
                <FaUsers className="h-4 w-4 mr-2" />
                <span className="text-sm">Max Users</span>
              </div>
              <span className="text-sm font-medium">{plan.maxUsers}</span>
            </div>
          )}

          {plan.maxProducts && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600">
                <FaBox className="h-4 w-4 mr-2" />
                <span className="text-sm">Max Products</span>
              </div>
              <span className="text-sm font-medium">{plan.maxProducts}</span>
            </div>
          )}

          {plan.maxSalesPerMonth && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600">
                <FaShoppingCart className="h-4 w-4 mr-2" />
                <span className="text-sm">Max Sales/Month</span>
              </div>
              <span className="text-sm font-medium">{plan.maxSalesPerMonth}</span>
            </div>
          )}
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Features</h4>
          <div className="space-y-1">
            {plan.features.slice(0, 3).map((feature) => (
              <div key={feature.id} className="flex items-center text-sm text-gray-600">
                <FaCheck className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                <span className="truncate">{feature.name}</span>
              </div>
            ))}
            {plan.features.length > 3 && (
              <div className="text-sm text-gray-500">
                +{plan.features.length - 3} more features
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              {plan.isActive ? (
                <FaCheck className="h-4 w-4 text-green-500" />
              ) : (
                <FaTimes className="h-4 w-4 text-red-500" />
              )}
              <span className="ml-1 text-sm text-gray-600">
                {plan.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {plan.subscriptionCount} subscription{plan.subscriptionCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

// Plan Modal Component
function PlanModal({
  isOpen,
  isEditing,
  formData,
  setFormData,
  features,
  onSave,
  onCancel,
}: {
  isOpen: boolean;
  isEditing: boolean;
  formData: PlanFormData;
  setFormData: (data: PlanFormData) => void;
  features: PlanFeature[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  const handleFeatureToggle = (featureId: string) => {
    setFormData({
      ...formData,
      featureIds: formData.featureIds.includes(featureId)
        ? formData.featureIds.filter(id => id !== featureId)
        : [...formData.featureIds, featureId],
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {isEditing ? 'Edit Plan' : 'Create New Plan'}
          </h3>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Pro Plan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interval
                </label>
                <select
                  value={formData.interval}
                  onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the plan features and benefits"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (in cents)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stripe Price ID
                </label>
                <input
                  type="text"
                  value={formData.stripePriceId}
                  onChange={(e) => setFormData({ ...formData, stripePriceId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="price_..."
                />
              </div>
            </div>

            {/* Limits */}
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">Limits</h4>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Users
                  </label>
                  <input
                    type="number"
                    value={formData.maxUsers || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      maxUsers: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Products
                  </label>
                  <input
                    type="number"
                    value={formData.maxProducts || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      maxProducts: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Sales/Month
                  </label>
                  <input
                    type="number"
                    value={formData.maxSalesPerMonth || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      maxSalesPerMonth: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Branches
                  </label>
                  <input
                    type="number"
                    value={formData.maxBranches || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      maxBranches: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Unlimited"
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">Features</h4>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {features.map((feature) => (
                  <label key={feature.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.featureIds.includes(feature.id)}
                      onChange={() => handleFeatureToggle(feature.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{feature.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="ml-2 text-sm text-gray-700">Active Plan</label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : (isEditing ? 'Update Plan' : 'Create Plan')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
