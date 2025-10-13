'use client';
import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/utils/api';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

interface Subscription {
  id: string;
  plan: Plan;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  scheduledPlanId?: string | null;
  scheduledEffectiveDate?: string | null;
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [schedulingDate, setSchedulingDate] = useState<string>('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPlans();
    fetchSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      const data = await apiGet('/subscription/plans');
      setPlans(data as Plan[]);
    } catch {
      setError('Failed to load plans');
    }
  };

  const fetchSubscription = async () => {
    try {
      const data = await apiGet('/subscription/current');
      setSubscription(data as Subscription);
      setSelectedPlanId((data as Subscription)?.plan?.id || null);
    } catch (err: unknown) {
      // If no subscription found, don't show error - user can select a plan
      // Only show error for actual API failures, not missing subscriptions
      if (
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof (err as { message?: string }).message === 'string' &&
        !(err as { message: string }).message.includes('No active subscription found')
      ) {
        setError('Failed to load subscription');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async () => {
    if (!selectedPlanId) return;

    try {
      if (subscription) {
        // Existing subscription - upgrade
        setMessage('Processing upgrade...');
        await apiPost('/subscription/upgrade', {
          planId: selectedPlanId,
          effectiveDate: schedulingDate || null,
        });
        setMessage('Upgrade scheduled successfully!');
      } else {
        // No subscription - create new one
        setMessage('Creating subscription...');
        await apiPost('/subscription/create', {
          planId: selectedPlanId,
        });
        setMessage('Subscription created successfully!');
      }
      fetchSubscription();
    } catch {
      setMessage(subscription ? 'Failed to upgrade subscription' : 'Failed to create subscription');
    }
  };

  const handleCancel = async () => {
    try {
      setMessage('Cancelling subscription...');
      await apiPost('/subscription/cancel', {});
      setMessage('Subscription cancelled successfully!');
      fetchSubscription();
    } catch {
      setMessage('Failed to cancel subscription');
    }
  };

  const handleResume = async () => {
    try {
      setMessage('Resuming subscription...');
      await apiPost('/subscription/resume', {});
      setMessage('Subscription resumed successfully!');
      fetchSubscription();
    } catch {
      setMessage('Failed to resume subscription');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
        <p className="text-gray-600">Manage your subscription and billing information</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {message && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{message}</p>
        </div>
      )}

      {/* Current Subscription */}
      {subscription && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Subscription</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Plan</p>
              <p className="font-medium">{subscription.plan.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                subscription.status === 'canceled' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {subscription.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Next Billing</p>
              <p className="font-medium">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
            </div>
          </div>

          {subscription.scheduledPlanId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                Plan change scheduled for {new Date(subscription.scheduledEffectiveDate!).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="flex space-x-4">
            {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                Cancel Subscription
              </button>
            )}

            {subscription.cancelAtPeriodEnd && (
              <button
                onClick={handleResume}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
              >
                Resume Subscription
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plan Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {subscription ? 'Change Plan' : 'Select Plan'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedPlanId === plan.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedPlanId(plan.id)}
            >
              <h3 className="font-medium text-gray-900">{plan.name}</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                ${plan.price / 100}/month
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.slice(0, 3).map((feature, index) => (
                  <li key={index} className="text-sm text-gray-600">• {feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          {subscription && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule Change (Optional)
              </label>
              <input
                type="date"
                value={schedulingDate}
                onChange={(e) => setSchedulingDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}

          <button
            onClick={handlePlanChange}
            disabled={!selectedPlanId || selectedPlanId === subscription?.plan?.id}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {subscription
              ? (schedulingDate ? 'Schedule Change' : 'Change Plan Now')
              : 'Subscribe Now'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
